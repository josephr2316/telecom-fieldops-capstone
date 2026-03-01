import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/errorHandler";
import { baseReqLog, logger } from "../infra/logger/logger";
import { auditService } from "../domain/services/audit.service";

const ListAuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function auditRouter() {
  const router = Router();

  router.get(
    "/",
    validate(ListAuditQuerySchema, "query"),
    async (req, res) => {
        const entityType = req.query.entityType as string;
        const entityId = req.query.entityId as string;
        const action = req.query.action as string;
        const limit = Number(req.query.limit);
        const offset = Number(req.query.offset);

      try {
        const { items, total } = auditService.list({
          entityType,
          entityId,
          action,
          limit: Number(limit),
          offset: Number(offset),
        });

        logger.info({...baseReqLog(req), itemsCount: items.length, total,filters: { entityType, entityId, action },}, "Audit events listed");

        res.status(200).json({
          items,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: Number(offset) + Number(limit) < total,
          },
        });
      } catch (err) {
        logger.error({ ...baseReqLog(req), error: err instanceof Error ? err.message : err },"Error listing audit events");
        throw err;
      }
    }
  );

  router.get(
    "/:auditId",
    async (req, res) => {
      const { auditId } = req.params;

      try {
        const event = auditService.getById(auditId);

        if (!event) {
          throw new AppError({
            status: 404,
            title: "Not Found",
            detail: `Audit event with ID '${auditId}' not found.`,
            type: "urn:telecom:error:audit_not_found",
          });
        }

        logger.info({ ...baseReqLog(req), auditId, action: event.action },"Audit event retrieved");

        res.status(200).json(event);
      } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ ...baseReqLog(req), auditId, error: err instanceof Error ? err.message : err }, "Error retrieving audit event");
        throw err;
      }
    }
  );

  router.get(
    "/entity/:entityType/:entityId",
    async (req, res) => {
      const { entityType, entityId } = req.params;

      try {
        const { events, total } = auditService.getHistory(
          entityType,
          entityId
        );

        logger.info({...baseReqLog(req), entityType, entityId, eventCount: events.length,}, "Entity audit history retrieved");

        res.status(200).json({
          entity: {
            type: entityType,
            id: entityId,
          },
          events,
          total,
        });
      } catch (err) {
        logger.error({...baseReqLog(req), entityType, entityId, error: err instanceof Error ? err.message : err,}, "Error retrieving entity history");
        throw err;
      }
    }
  );

  router.get(
    "/user/:userId",
    async (req, res) => {
      const { userId } = req.params;
      const limitQuery = Number(req.query.limit ?? 100);
      const limit = Math.min(Math.max(limitQuery, 1), 1000);

      try {
        const events = auditService.getByUser(userId, limit);

        logger.info({...baseReqLog(req), userId, eventCount: events.length,}, "User audit events retrieved");

        res.status(200).json({
          user: userId,
          events,
          count: events.length,
        });
      } catch (err) {
        logger.error({...baseReqLog(req), userId, error: err instanceof Error ? err.message : err, }, "Error retrieving user events");
        throw err;
      }
    }
  );

  router.get(
    "/search",
    async (req, res) => {
      const { action, entityType, startDate, endDate, limit = 50 } = req.query;

      try {
        let events = auditService.list({
          action: action as string | undefined,
          entityType: entityType as string | undefined,
          limit: Math.min(Number(limit), 100),
        }).items;

        if (startDate || endDate) {
          const start = startDate ? new Date(startDate as string) : new Date(0);
          const end = endDate ? new Date(endDate as string) : new Date();

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError({
              status: 400,
              title: "Bad Request",
              detail: "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).",
              type: "urn:telecom:error:validation",
            });
          }

          events = auditService.getByDateRange(start, end);
        }

        logger.info({...baseReqLog(req), filters: { action, entityType, startDate, endDate }, resultCount: events.length,}, "Audit search performed");

        res.status(200).json({
          criteria: {
            action: action || null,
            entityType: entityType || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
          events,
          count: events.length,
        });
      } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ ...baseReqLog(req), error: err instanceof Error ? err.message : err }, "Error in audit search");
        throw err;
      }
    }
  );

  return router;
}
