import { v4 as uuidv4 } from 'uuid';
import type { AuditAction, AuditEvent } from '../models/types';
import { auditRepository } from '../../infra/repositories/audit.repo';

interface ListOptions {
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

class AuditService {
  record(input: {
    actorUserId: string | null;
    action: AuditAction | string;
    entityType: string;
    entityId: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    correlationId: string;
  }): void {
    auditRepository.insert({
      id: `aud-${uuidv4()}`,
      at: new Date().toISOString(),
      ...input,
      action: input.action as AuditAction,
    });
  }

  list(options: ListOptions = {}): { items: AuditEvent[]; total: number } {
    const { entityType, entityId, action, limit = 50, offset = 0 } = options;

    const allEvents = auditRepository.list();

    let filtered = [...allEvents];

    if (entityType) {
      filtered = filtered.filter(e => e.entityType === entityType);
    }
    if (entityId) {
      filtered = filtered.filter(e => e.entityId === entityId);
    }
    if (action) {
      filtered = filtered.filter(e => (e.action as string) === action);
}

    filtered.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return { items, total };
  }

  getHistory(entityType: string, entityId: string) {
    const allEvents = auditRepository.list();
    const events = allEvents
      .filter(e => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      events,
      total: events.length,
    };
  }

  getCount(): number {
    return auditRepository.list().length;
  }
}

export const auditService = new AuditService();