import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { baseReqLog, logger } from '../infra/logger/logger';
import { auditService } from '../domain/services/audit.service';

const ListAuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function auditRouter() {
  const router = Router();

  /** GET /: list audit events with optional filters and pagination. */
  router.get(
    '/',
    validate(ListAuditQuerySchema, 'query'),
    async (req, res, next) => {
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId as string;
      const action = req.query.action as string;
      const limit = Number(req.query.limit);
      const offset = Number(req.query.offset);

      try {
        const { items, total } = await auditService.list({
          entityType,
          entityId,
          action,
          limit: Number(limit),
          offset: Number(offset),
        });

        logger.info(
          {
            ...baseReqLog(req),
            itemsCount: items.length,
            total,
            filters: { entityType, entityId, action },
          },
          'Audit events listed',
        );

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
        logger.error(
          {
            ...baseReqLog(req),
            error: err instanceof Error ? err.message : err,
          },
          'Error listing audit events',
        );
        next(err);
      }
    },
  );

  /** GET /search: search by action, entityType, and optional date range. */
  router.get('/search', async (req, res, next) => {
    const { action, entityType, limit = 50 } = req.query;

    try {
      const { items } = await auditService.list({
        action: action as string,
        entityType: entityType as string,
        limit: Math.min(Number(limit), 100),
      });
      
      res.status(200).json({
        criteria: { action: action || null, entityType: entityType || null },
        events: items,
        count: items.length,
      });
      logger.info(
        {
          ...baseReqLog(req),
          filters: { action, entityType },
          resultCount: items.length,
        },
        'Audit search performed',
      );
    } catch (err) {
      next(err);
    }
  });
      
  /** GET /:auditId: get a single audit event by id. */
  router.get('/:auditId', async (req, res, next) => {
    const { auditId } = req.params;

    try {
      const { items } = await auditService.list({ limit: 1 });
      const event = items.find(i => (i as any).id === auditId);

      if (!event) {
        throw new AppError({
          status: 404,
          title: 'Not Found',
          detail: `Audit event with ID '${auditId}' not found.`,
          type: 'urn:telecom:error:audit_not_found',
        });
      }

      logger.info(
        { ...baseReqLog(req), auditId, action: event.action },
        'Audit event retrieved',
      );

      res.status(200).json(event);
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(
        {
          ...baseReqLog(req),
          auditId,
          error: err instanceof Error ? err.message : err,
        },
        'Error retrieving audit event',
      );
      next(err);
    }
  });

  /** GET /entity/:entityType/:entityId: get full audit history for an entity. */
  router.get('/entity/:entityType/:entityId', async (req, res, next) => {
    const { entityType, entityId } = req.params;

    try {
      const { events, total } = await auditService.getHistory(entityType, entityId);

      logger.info(
        { ...baseReqLog(req), entityType, entityId, eventCount: events.length },
        'Entity audit history retrieved',
      );

      res.status(200).json({
        entity: { type: entityType, id: entityId },
        events,
        total,
      });
    } catch (err) {
      logger.error(
        {
          ...baseReqLog(req),
          entityType,
          entityId,
          error: err instanceof Error ? err.message : err,
        },
        'Error retrieving entity history',
      );
      next(err);
    }
  });

  /** GET /user/:userId: get audit events by actor user id. */
  router.get('/user/:userId', async (req, res, next) => {
    const { userId } = req.params;
    const limitQuery = Number(req.query.limit ?? 100);
    const limit = Math.min(Math.max(limitQuery, 1), 1000);

    try {
      const { items } = await auditService.list({ limit});

      const userEvents = items.filter(i => (i as any).actorUserId === userId);

      logger.info(
        { ...baseReqLog(req), userId, eventCount: userEvents.length },
        'User audit events retrieved',
      );

      res.status(200).json({
        user: userId,
        events: userEvents,
        eventCount: userEvents.length,
      });
    } catch (err) {
      logger.error(
        {
          ...baseReqLog(req),
          userId,
          error: err instanceof Error ? err.message : err,
        },
        'Error retrieving user events',
      );
      next(err);
    }
  });

  return router;
}