import { ApiError } from '../errors/apiError';
import type { ChecklistItem, WorkOrder, WorkOrderItem, WorkOrderStatus, WorkOrderType } from '../models/types';
import type { UpdateWorkOrderInput } from '../../infra/repositories/workorder.repo';
import { workOrderRepository } from '../../infra/repositories/workorder.repo';
import { inventoryService } from './invetory.service';
import { allowedTransitions, validateTransition } from '../stateMachine/workOrderStateMachine';
import { auditService } from './audit.service';
import { AUDIT_ACTIONS } from '../models/types';

export interface CreateWorkOrderPayload {
  type: WorkOrderType;
  customerId: string;
  branchId?: string;
  planId?: string;
  items?: WorkOrderItem[];
}

export interface UpdateWorkOrderStatusPayload {
  newStatus: WorkOrderStatus;
  baseVersion: number;
}

export const workOrderService = {
  async listWorkOrders(assignedToUserId?: string): Promise<Array<WorkOrder & { allowedTransitions: WorkOrderStatus[] }>> {
    const list = assignedToUserId
      ? await workOrderRepository.listByAssignedTech(assignedToUserId)
      : await workOrderRepository.listAll();
    return list.map((wo) => ({
      ...wo,
      allowedTransitions: allowedTransitions(wo.type, wo.status),
    }));
  },

  async getWorkOrder(id: string): Promise<(WorkOrder & { allowedTransitions: WorkOrderStatus[] }) | null> {
    const wo = await workOrderRepository.findById(id);
    if (!wo) return null;
    return { ...wo, allowedTransitions: allowedTransitions(wo.type, wo.status) };
  },

  async createWorkOrder(payload: CreateWorkOrderPayload, actorUserId: string | null, correlationId: string) {
    const created = await workOrderRepository.create({
      ...payload,
      createdByUserId: actorUserId ?? undefined,
    });

    await auditService.record({
      actorUserId,
      action: AUDIT_ACTIONS.WORKORDER_CREATED,
      entityType: 'WorkOrder',
      entityId: created.id,
      before: null,
      after: created as unknown as Record<string, unknown>,
      correlationId,
    });

    return created;
  },

  async updateStatus(
    id: string,
    input: UpdateWorkOrderStatusPayload,
    actorUserId: string | null,
    correlationId: string,
  ) {
    const wo = await workOrderRepository.findById(id);
    if (!wo) {
      throw new ApiError(404, 'Not Found', 'Work order not found', 'urn:telecom:error:workorder-not-found');
    }

    if (input.baseVersion !== wo.version) {
      throw new ApiError(409, 'Conflict', 'Version mismatch', 'urn:telecom:error:version_mismatch');
    }

    validateTransition(wo.type, wo.status, input.newStatus);

    if (input.newStatus === 'INVENTORY_RESERVATION' && wo.items && wo.items.length > 0) {
      try {
        await inventoryService.reserveForRequest({
          workOrderId: wo.id,
          branchId: wo.branchId ?? '',
          items: wo.items,
        });
      } catch (err) {
        if (err instanceof ApiError && err.message.includes('Insufficient stock')) {
          throw new ApiError(409, 'Conflict', 'stock_insufficient', 'urn:telecom:error:stock_insufficient');
        }
        throw err;
      }
    }

    if (input.newStatus === 'CANCELLED') {
      try {
        await inventoryService.releaseForRequest(wo.id);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          throw err;
        }
      }
    }

    const before = { status: wo.status, version: wo.version };
    const updated = await workOrderRepository.update(id, {
      status: input.newStatus,
      version: wo.version + 1,
    });

    if (!updated) {
      throw new ApiError(500, 'Internal Server Error', 'Unable to update work order', 'urn:telecom:error:internal');
    }

    await auditService.record({
      actorUserId,
      action: AUDIT_ACTIONS.WORKORDER_STATUS,
      entityType: 'WorkOrder',
      entityId: id,
      before,
      after: { status: updated.status, version: updated.version },
      correlationId,
    });

    return updated;
  },

  async assignTech(
    id: string,
    assignedTechUserId: string | null,
    actorUserId: string | null,
    correlationId: string,
  ) {
    const wo = await workOrderRepository.findById(id);
    if (!wo) return null;

    const before = { assignedTechUserId: wo.assignedTechUserId };
    const payload: UpdateWorkOrderInput = {
      assignedTechUserId: assignedTechUserId === null ? null : assignedTechUserId,
    };
    const updated = await workOrderRepository.update(id, payload);
    if (!updated) return null;

    await auditService.record({
      actorUserId,
      action: AUDIT_ACTIONS.WORKORDER_STATUS,
      entityType: 'WorkOrder',
      entityId: id,
      before,
      after: { assignedTechUserId: updated.assignedTechUserId },
      correlationId,
    });

    return { ...updated, allowedTransitions: allowedTransitions(updated.type, updated.status) };
  },

  async updateTechDetails(
    id: string,
    payload: { technicianNotes?: string | null; checklist?: ChecklistItem[] | null },
    actorUserId: string | null,
  ) {
    const wo = await workOrderRepository.findById(id);
    if (!wo) return null;
    if (wo.assignedTechUserId !== actorUserId) {
      throw new ApiError(403, 'Forbidden', 'Only the assigned technician can update notes/checklist.', 'urn:telecom:error:forbidden');
    }
    const updated = await workOrderRepository.update(id, {
      technicianNotes: payload.technicianNotes,
      checklist: payload.checklist,
    });
    if (!updated) return null;
    return { ...updated, allowedTransitions: allowedTransitions(updated.type, updated.status) };
  },
};
