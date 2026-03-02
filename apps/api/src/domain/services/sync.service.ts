import type { WorkOrderStatus } from '../models/types';
import { ApiError } from '../errors/apiError';
import { workOrderService } from './workorder.service';

export interface SyncImportMeta {
  exportedAt: string;
  deviceId: string;
  appVersion: string;
}

export interface SyncImportOperation {
  opId: string;
  entityType: string;
  entityId: string;
  operation: string;
  payload: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  baseVersion: number;
  correlationId?: string;
}

export interface SyncImportRequest {
  meta: SyncImportMeta;
  operations: SyncImportOperation[];
}

export interface SyncImportConflict {
  opId: string;
  entityId: string;
  reason: string;
}

export interface SyncImportResponse {
  appliedCount: number;
  conflictCount: number;
  conflicts: SyncImportConflict[];
}

/**
 * RF-12: Import offline operations. Applies each operation (CHANGE_STATUS, ADD_NOTE) to work orders.
 * Uses baseVersion for conflict detection: if server version !== baseVersion, the operation is not applied and counted as conflict.
 */
export const syncService = {
  async import(
    body: SyncImportRequest,
    actorUserId: string | null,
    correlationId: string,
  ): Promise<SyncImportResponse> {
    const conflicts: SyncImportConflict[] = [];
    let appliedCount = 0;

    for (const op of body.operations ?? []) {
      if (op.entityType !== 'workOrder') {
        conflicts.push({
          opId: op.opId,
          entityId: op.entityId,
          reason: 'Unsupported entity type',
        });
        continue;
      }

      const wo = await workOrderService.getWorkOrder(op.entityId);
      if (!wo) {
        conflicts.push({
          opId: op.opId,
          entityId: op.entityId,
          reason: 'Work order not found',
        });
        continue;
      }

      if (wo.version !== op.baseVersion) {
        conflicts.push({
          opId: op.opId,
          entityId: op.entityId,
          reason: 'Version mismatch',
        });
        continue;
      }

      try {
        if (op.operation === 'CHANGE_STATUS') {
          const newStatus = op.payload?.newStatus as string | undefined;
          const baseVersion = op.payload?.baseVersion as number | undefined;
          if (typeof newStatus !== 'string' || typeof baseVersion !== 'number') {
            conflicts.push({
              opId: op.opId,
              entityId: op.entityId,
              reason: 'Invalid payload for CHANGE_STATUS',
            });
            continue;
          }
          await workOrderService.updateStatus(
            op.entityId,
            { newStatus: newStatus as WorkOrderStatus, baseVersion },
            actorUserId,
            correlationId,
          );
          appliedCount++;
        } else if (op.operation === 'ADD_NOTE') {
          const technicianNotes = (op.payload?.technicianNotes as string | null) ?? undefined;
          const checklist = op.payload?.checklist as Array<{ id: string; label: string; completed: boolean }> | null | undefined;
          const updated = await workOrderService.updateTechDetails(
            op.entityId,
            { technicianNotes, checklist: checklist ?? null },
            actorUserId,
          );
          if (updated) {
            appliedCount++;
          } else {
            conflicts.push({
              opId: op.opId,
              entityId: op.entityId,
              reason: 'Update rejected (e.g. not assigned to this work order)',
            });
          }
        } else {
          conflicts.push({
            opId: op.opId,
            entityId: op.entityId,
            reason: `Unsupported operation: ${op.operation}`,
          });
        }
      } catch (err) {
        const reason =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        conflicts.push({
          opId: op.opId,
          entityId: op.entityId,
          reason,
        });
      }
    }

    return {
      appliedCount,
      conflictCount: conflicts.length,
      conflicts,
    };
  },
};
