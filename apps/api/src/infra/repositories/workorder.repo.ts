import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/prisma';
import { prisma } from '../db/prisma/prismaClient';
import type { ChecklistItem, WorkOrder, WorkOrderItem, WorkOrderStatus, WorkOrderType } from '../../domain/models/types';

export interface CreateWorkOrderInput {
  type: WorkOrderType;
  customerId: string;
  createdByUserId?: string;
  branchId?: string;
  planId?: string;
  items?: WorkOrderItem[];
}

export interface UpdateWorkOrderInput {
  status?: WorkOrderStatus;
  version?: number;
  completedAt?: string | null;
  cancelledAt?: string | null;
  branchId?: string;
  planId?: string;
  assignedTechUserId?: string | null;
  items?: WorkOrderItem[];
  technicianNotes?: string | null;
  checklist?: ChecklistItem[] | null;
}

type PrismaWorkOrder = {
  id: string;
  type: string;
  status: string;
  customerId: string;
  branchId: string | null;
  planId: string | null;
  assignedTechUserId: string | null;
  version: number;
  items: unknown;
  technicianNotes?: string | null;
  checklist?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toDomainWorkOrder(row: PrismaWorkOrder): WorkOrder {
  const items = Array.isArray(row.items) ? (row.items as WorkOrderItem[]) : [];
  const checklist = row.checklist != null && Array.isArray(row.checklist) ? (row.checklist as ChecklistItem[]) : null;
  return {
    id: row.id,
    type: row.type as WorkOrderType,
    status: row.status as WorkOrderStatus,
    customerId: row.customerId,
    branchId: row.branchId ?? undefined,
    planId: row.planId ?? undefined,
    assignedTechUserId: row.assignedTechUserId ?? undefined,
    version: row.version,
    items,
    technicianNotes: row.technicianNotes != null ? row.technicianNotes : undefined,
    checklist: checklist ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const workOrderRepository = {
  async listAll(): Promise<WorkOrder[]> {
    const rows = await prisma.workOrder.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toDomainWorkOrder);
  },

  async listByAssignedTech(userId: string): Promise<WorkOrder[]> {
    const rows = await prisma.workOrder.findMany({
      where: { assignedTechUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomainWorkOrder);
  },

  async findById(id: string): Promise<WorkOrder | null> {
    const row = await prisma.workOrder.findUnique({ where: { id } });
    return row ? toDomainWorkOrder(row) : null;
  },

  async create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    const created = await prisma.workOrder.create({
      data: {
        id: `wo_${randomUUID().slice(0, 8)}`,
        type: input.type,
        status: 'DRAFT',
        customerId: input.customerId,
        branchId: input.branchId ?? null,
        planId: input.planId ?? null,
        assignedTechUserId: null,
        version: 0,
        items: (input.items ?? []) as object,
      },
    });

    return toDomainWorkOrder(created);
  },

  async update(id: string, input: UpdateWorkOrderInput): Promise<WorkOrder | null> {
    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const data: {
      status?: string;
      version?: number;
      branchId?: string | null;
      planId?: string | null;
      assignedTechUserId?: string | null;
      items?: object;
      technicianNotes?: string | null;
      checklist?: object | typeof Prisma.DbNull;
    } = {};

    if (input.status !== undefined) data.status = input.status;
    if (input.version !== undefined) data.version = input.version;
    if (input.branchId !== undefined) data.branchId = input.branchId ?? null;
    if (input.planId !== undefined) data.planId = input.planId ?? null;
    if (input.assignedTechUserId !== undefined) data.assignedTechUserId = input.assignedTechUserId ?? null;
    if (input.items !== undefined) data.items = input.items as object;
    if (input.technicianNotes !== undefined) data.technicianNotes = input.technicianNotes ?? null;
    if (input.checklist !== undefined) {
      data.checklist = input.checklist === null ? Prisma.DbNull : (input.checklist as object);
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: data as Parameters<typeof prisma.workOrder.update>[0]['data'],
    });
    return toDomainWorkOrder(updated);
  },
};
