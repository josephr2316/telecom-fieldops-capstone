import { inventoryService } from './invetory.service';
import { workOrderRepository } from '../../infra/repositories/workorder.repo';
import { userRepository } from '../../infra/repositories/user.repo';
import type { WorkOrder, WorkOrderStatus } from '../models/types';

const VALID_STATUSES = new Set<WorkOrderStatus>([
  'DRAFT',
  'SUBMITTED',
  'ELIGIBILITY_CHECK',
  'INVENTORY_RESERVATION',
  'ON_HOLD',
  'SCHEDULED',
  'IN_PROGRESS',
  'VERIFICATION',
  'COMPLETED',
  'REJECTED',
  'IN_REVIEW',
  'TECH_ASSIGNMENT',
  'PRODUCT_SELECTION',
  'PAYMENT_CONFIRMATION',
  'FULFILLMENT',
  'DELIVERY',
  'PAYMENT_VALIDATION',
  'RECEIPT_ISSUED',
  'PLAN_CHANGE',
  'TRIAGE',
  'FIELD_DISPATCH',
  'CONFLICT',
  'CANCELLED',
]);

const TERMINAL_STATUSES = new Set<WorkOrderStatus>(['COMPLETED', 'REJECTED', 'CANCELLED']);
const CRITICAL_THRESHOLD = 10;

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameLocalDay = (a: Date, b: Date): boolean => {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const round = (value: number): number => Math.round(value * 100) / 100;

const calcHoursBetween = (start: Date, end: Date): number => (end.getTime() - start.getTime()) / (1000 * 60 * 60);

const isValidForKpi = async (workOrder: WorkOrder): Promise<boolean> => {
  if (!VALID_STATUSES.has(workOrder.status as WorkOrderStatus)) {
    return false;
  }

  const createdAt = parseDate(workOrder.createdAt);
  if (!createdAt) {
    return false;
  }

  if (workOrder.createdByUserId) {
    const creator = await userRepository.findById(workOrder.createdByUserId);
    if (!creator || creator.blocked) {
      return false;
    }
  }

  return true;
};

export const kpiService = {
  async getDashboardKpis() {
    const now = new Date();
    const allWorkOrders = await workOrderRepository.listAll();
    const validWorkOrders: WorkOrder[] = [];
    for (const wo of allWorkOrders) {
      if (await isValidForKpi(wo)) validWorkOrders.push(wo);
    }
    const totalValid = validWorkOrders.length;

    const createdTodayByType = validWorkOrders.reduce<Record<string, number>>((acc: Record<string, number>, current: WorkOrder) => {
      const createdAt = parseDate(current.createdAt);
      if (!createdAt || !isSameLocalDay(createdAt, now)) {
        return acc;
      }
      acc[current.type] = (acc[current.type] ?? 0) + 1;
      return acc;
    }, {});

    const completedToday = validWorkOrders.filter((item: WorkOrder) => {
      if (item.status !== 'COMPLETED') {
        return false;
      }
      const completedAt = parseDate(item.completedAt);
      return completedAt ? isSameLocalDay(completedAt, now) : false;
    }).length;

    const cancelledTotal = validWorkOrders.filter((item: WorkOrder) => item.status === 'CANCELLED').length;
    const cancellationRate = totalValid > 0 ? round((cancelledTotal / totalValid) * 100) : 0;

    const cycleHoursByType = validWorkOrders.reduce<Record<string, number[]>>((acc: Record<string, number[]>, current: WorkOrder) => {
      if (current.status !== 'COMPLETED') {
        return acc;
      }
      const createdAt = parseDate(current.createdAt);
      const completedAt = parseDate(current.completedAt);
      if (!createdAt || !completedAt || completedAt < createdAt) {
        return acc;
      }
      const list = acc[current.type] ?? [];
      list.push(calcHoursBetween(createdAt, completedAt));
      acc[current.type] = list;
      return acc;
    }, {});

    const avgCycleHoursByType = Object.entries(cycleHoursByType).reduce<Record<string, number>>(
      (acc: Record<string, number>, [type, durations]: [string, number[]]) => {
        const total = durations.reduce((sum: number, current: number) => sum + current, 0);
        acc[type] = durations.length > 0 ? round(total / durations.length) : 0;
        return acc;
      },
      {},
    );

    const backlogByStatus = validWorkOrders.reduce<Record<string, number>>((acc: Record<string, number>, current: WorkOrder) => {
      if (TERMINAL_STATUSES.has(current.status)) {
        return acc;
      }
      acc[current.status] = (acc[current.status] ?? 0) + 1;
      return acc;
    }, {});

    const branches = await inventoryService.listBranches();
    const allInventory = await inventoryService.listAllInventory();

    const criticalInventoryByBranch = branches.map((branch: { id: string; name: string }) => {
      const criticalItems = allInventory.filter(
        (row: { branchId: string; qtyAvailable: number }) => row.branchId === branch.id && row.qtyAvailable <= CRITICAL_THRESHOLD,
      );

      return {
        branchId: branch.id,
        branchName: branch.name,
        threshold: CRITICAL_THRESHOLD,
        criticalItems: criticalItems.length,
      };
    });

    type InventoryRowWithName = { productId: string; productName: string; qtyReserved: number };
    const topReservedProducts = allInventory
      .filter((item: InventoryRowWithName) => item.qtyReserved > 0)
      .reduce<Record<string, { productId: string; productName: string; reservedQty: number }>>((acc: Record<string, { productId: string; productName: string; reservedQty: number }>, current: InventoryRowWithName) => {
        const existing = acc[current.productId] ?? {
          productId: current.productId,
          productName: current.productName,
          reservedQty: 0,
        };
        existing.reservedQty += current.qtyReserved;
        acc[current.productId] = existing;
        return acc;
      }, {});

    type ReservedProduct = { productId: string; productName: string; reservedQty: number };
    const top5ReservedProducts = Object.values(topReservedProducts)
      .sort((a: ReservedProduct, b: ReservedProduct) => b.reservedQty - a.reservedQty)
      .slice(0, 5);

    const claimsByFailureCategory = validWorkOrders
      .filter((item: WorkOrder) => item.type === 'CLAIM_TROUBLESHOOT')
      .reduce<Record<string, number>>((acc: Record<string, number>, current: WorkOrder) => {
        const category = current.status === 'CONFLICT' ? 'CONFLICT' : 'UNSPECIFIED';
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      }, {});

    const claimResolutionDurations = validWorkOrders
      .filter((item: WorkOrder) => item.type === 'CLAIM_TROUBLESHOOT' && item.status === 'COMPLETED')
      .map((item: WorkOrder) => {
        const createdAt = parseDate(item.createdAt);
        const completedAt = parseDate(item.completedAt);
        if (!createdAt || !completedAt || completedAt < createdAt) {
          return null;
        }
        return calcHoursBetween(createdAt, completedAt);
      })
      .filter((item): item is number => item !== null);

    const avgClaimResolutionHours =
      claimResolutionDurations.length > 0
        ? round(claimResolutionDurations.reduce((sum: number, current: number) => sum + current, 0) / claimResolutionDurations.length)
        : 0;

    const installationSet = new Set<string>(['NEW_SERVICE_INSTALL', 'SERVICE_UPGRADE']);
    const installationWorkOrders = validWorkOrders.filter((item: WorkOrder) => installationSet.has(item.type));
    const failedInstallationCount = installationWorkOrders.filter((item: WorkOrder) =>
      item.status === 'REJECTED' || item.status === 'CONFLICT',
    ).length;
    const failedInstallationRate =
      installationWorkOrders.length > 0 ? round((failedInstallationCount / installationWorkOrders.length) * 100) : 0;

    const totalCreatedToday = Object.values(createdTodayByType).reduce((sum: number, current: number) => sum + current, 0);
    const totalBacklog = Object.values(backlogByStatus).reduce((sum: number, current: number) => sum + current, 0);
    type BranchCritical = { branchId: string; branchName: string; threshold: number; criticalItems: number };
    const totalCriticalItems = criticalInventoryByBranch.reduce((sum: number, current: BranchCritical) => sum + current.criticalItems, 0);

    return {
      generatedAt: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      source: {
        workOrders: 'apps/api/src/infra/repositories/workorder.repo.ts',
        inventory: 'apps/api/src/domain/services/invetory.service.ts',
        users: 'apps/api/src/infra/repositories/user.repo.ts',
      },
      kpis: {
        kpi01CreatedTodayByType: {
          formula: 'count(workOrders where createdAt=today) grouped by type',
          total: totalCreatedToday,
          byType: createdTodayByType,
        },
        kpi02CompletedToday: {
          formula: 'count(workOrders where status=COMPLETED and completedAt=today)',
          value: completedToday,
        },
        kpi03CancellationRate: {
          formula: 'cancelled / total_valid * 100',
          cancelled: cancelledTotal,
          totalValid,
          percentage: cancellationRate,
        },
        kpi04AvgCycleHoursByType: {
          formula: 'avg(hours(createdAt -> completedAt)) grouped by type',
          byType: avgCycleHoursByType,
        },
        kpi05BacklogByStatus: {
          formula: 'count(valid workOrders in non terminal statuses)',
          byStatus: backlogByStatus,
        },
        kpi06CriticalInventoryByBranch: {
          formula: `count(inventory where qtyAvailable <= ${CRITICAL_THRESHOLD}) grouped by branch`,
          byBranch: criticalInventoryByBranch,
        },
        kpi07TopReservedProducts: {
          formula: 'top 5 by sum(qtyReserved) across inventory rows',
          top5: top5ReservedProducts,
        },
        kpi08ClaimsByFailureCategory: {
          formula: 'count(claim workorders) grouped by failure category',
          byCategory: claimsByFailureCategory,
        },
        kpi09AvgClaimResolutionHours: {
          formula: 'avg(hours(createdAt -> completedAt)) for completed CLAIM_TROUBLESHOOT',
          value: avgClaimResolutionHours,
        },
        kpi10FailedInstallationsRate: {
          formula: 'failed installations(REJECTED|CONFLICT) / installation total * 100',
          failedCount: failedInstallationCount,
          totalInstallations: installationWorkOrders.length,
          percentage: failedInstallationRate,
        },
      },
      cards: [
        { id: 'kpi01', label: 'Solicitudes creadas hoy', value: totalCreatedToday },
        { id: 'kpi02', label: 'Solicitudes completadas hoy', value: completedToday },
        { id: 'kpi03', label: 'Tasa cancelacion', value: cancellationRate, unit: 'percent' },
        { id: 'kpi05', label: 'Backlog total', value: totalBacklog },
        { id: 'kpi06', label: 'Inventario critico', value: totalCriticalItems },
        { id: 'kpi07', label: 'Productos reservados activos', value: top5ReservedProducts.length },
        { id: 'kpi09', label: 'Resolucion reclamos (h)', value: avgClaimResolutionHours, unit: 'hours' },
        { id: 'kpi10', label: 'Instalaciones fallidas %', value: failedInstallationRate, unit: 'percent' },
      ],
      validationRules: [
        'Only valid work order statuses are counted',
        'Work orders with invalid dates are excluded',
        'If createdByUserId exists, the user must exist and not be blocked (RB-06)',
      ],
    };
  },
};
