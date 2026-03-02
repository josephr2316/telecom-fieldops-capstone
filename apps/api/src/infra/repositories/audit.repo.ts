import { prisma } from '../db/prisma/prismaClient';
import type { AuditEvent } from '../../domain/models/types';

export interface ListAuditOptions {
  limit?: number;
  offset?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
}

/** Maps a Prisma Audit row to the domain AuditEvent type (at as ISO string, before/after as objects). */
function toDomainEvent(row: {
  id: string;
  at: Date;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  correlationId: string;
}): AuditEvent {
  return {
    id: row.id,
    at: row.at.toISOString(),
    actorUserId: row.actorUserId ?? null,
    action: row.action as AuditEvent['action'],
    entityType: row.entityType,
    entityId: row.entityId,
    before: (row.before as Record<string, unknown>) ?? null,
    after: (row.after as Record<string, unknown>) ?? null,
    correlationId: row.correlationId,
  };
}

/**
 * Audit event repository backed by Prisma (PostgreSQL).
 * All methods are async.
 */
export const auditRepository = {
  /** Inserts an audit event; returns the same event. */
  async insert(event: AuditEvent): Promise<AuditEvent> {
    await prisma.audit.create({
      data: {
        id: event.id,
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        before: (event.before ?? undefined) as object | undefined,
        after: (event.after ?? undefined) as object | undefined,
        correlationId: event.correlationId,
      },
    });
    return event;
  },

  /** Lists audit events with optional filters and pagination. */
  async list(opts?: ListAuditOptions): Promise<{ items: AuditEvent[]; total: number }> {
    const where: { entityType?: string; entityId?: string; action?: string } = {};
    if (opts?.entityType) where.entityType = opts.entityType;
    if (opts?.entityId) where.entityId = opts.entityId;
    if (opts?.action) where.action = opts.action;

    const [items, total] = await Promise.all([
      prisma.audit.findMany({
        where,
        orderBy: { at: 'desc' },
        skip: opts?.offset ?? 0,
        take: opts?.limit ?? 9999,
      }),
      prisma.audit.count({ where }),
    ]);

    return { items: items.map(toDomainEvent), total };
  },

  /** Returns a single audit event by id, or undefined if not found. */
  async getById(id: string): Promise<AuditEvent | undefined> {
    const row = await prisma.audit.findUnique({ where: { id } });
    return row ? toDomainEvent(row) : undefined;
  },

  /** Returns all events for a given entity type and id. */
  async getHistory(
    entityType: string,
    entityId: string,
  ): Promise<{ events: AuditEvent[]; total: number }> {
    const events = await prisma.audit.findMany({
      where: { entityType, entityId },
      orderBy: { at: 'desc' },
    });
    return { events: events.map(toDomainEvent), total: events.length };
  },

  /** Returns events by actor user id, optionally limited. */
  async getByUser(actorUserId: string, limit?: number): Promise<AuditEvent[]> {
    const rows = await prisma.audit.findMany({
      where: { actorUserId },
      orderBy: { at: 'desc' },
      ...(limit != null && limit > 0 ? { take: limit } : {}),
    });
    return rows.map(toDomainEvent);
  },

  /** Returns events within a date range (inclusive). */
  async getByDateRange(from: string | Date, to: string | Date): Promise<AuditEvent[]> {
    const fromDate = typeof from === 'string' ? new Date(from) : from;
    const toDate = typeof to === 'string' ? new Date(to) : to;
    const rows = await prisma.audit.findMany({
      where: {
        at: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { at: 'desc' },
    });
    return rows.map(toDomainEvent);
  },
};
