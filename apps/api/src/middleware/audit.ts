import type { Request } from "express";
import { logger, baseReqLog } from "../infra/logger/logger";

type AuditPayload = {
  action: string;
  entityType: string;
  entityId: string;
  before: any;
  after: any;
};

export async function writeAudit(req: Request, payload: AuditPayload) {
  const user = (req as any).user;
  const actorUserId = user?.id ?? "anonymous";
  const correlationId = (req as any).correlationId ?? "c_unknown";

  logger.info(
    {
      ...baseReqLog(req),
      actorUserId,
      correlationId,
      audit: payload,
    },
    "AUDIT_EVENT"
  );


}
