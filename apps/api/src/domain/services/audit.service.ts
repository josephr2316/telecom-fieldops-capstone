import { v4 as uuidv4 } from 'uuid';
import type { AuditAction } from '../models/types';
import {
  auditRepository,
  type ListAuditOptions,
} from '../../infra/repositories/audit.repo';

interface RecordAuditInput {
  actorUserId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string;
}

/**
 * Audit service: record events and query by filters, entity, user, or date range.
 * All methods are async and use the Prisma-backed audit repository.
 */
export const auditService = {
  /** Records an audit event with generated id and current timestamp. */
  async record(input: RecordAuditInput): Promise<void> {
    await auditRepository.insert({
      id: `aud-${uuidv4()}`,
      at: new Date().toISOString(),
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      correlationId: input.correlationId,
    });
  },

  /** Lists audit events with optional filters and pagination. */
  async list(opts?: ListAuditOptions) {
    return auditRepository.list(opts);
  },

  /** Returns a single audit event by id, or undefined if not found. */
  async getById(id: string) {
    return auditRepository.getById(id);
  },

  /** Returns full history for an entity type and id. */
  async getHistory(entityType: string, entityId: string) {
    return auditRepository.getHistory(entityType, entityId);
  },

  /** Returns events by actor user id, optionally limited. */
  async getByUser(actorUserId: string, limit?: number) {
    return auditRepository.getByUser(actorUserId, limit);
  },

  /** Returns events within a date range. */
  async getByDateRange(from: string | Date, to: string | Date) {
    return auditRepository.getByDateRange(from, to);
  },
};
