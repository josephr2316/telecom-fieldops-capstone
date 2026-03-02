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
  async record(input: {
    actorUserId: string | null;
    action: AuditAction | string;
    entityType: string;
    entityId: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    correlationId: string;
  }): Promise<void> {
    await auditRepository.insert({
      id: `aud-${uuidv4()}`,
      at: new Date().toISOString(),
      ...input,
      action: input.action as AuditAction,
    });
  }

  async list(options: ListOptions = {}){
    return await auditRepository.list(options);
  }

  async getHistory(entityType: string, entityId: string) {
    return await auditRepository.getHistory(entityType, entityId);
  }

  async getCount(): Promise<number> {
    const result = await auditRepository.list({ limit: 0 });
    return result.total;
  }
}

export const auditService = new AuditService();
