import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createRateLimit } from '../middleware/rateLimit';
import { syncService } from '../domain/services/sync.service';

const router = Router();

const syncImportSchema = z.object({
  meta: z.object({
    exportedAt: z.string(),
    deviceId: z.string(),
    appVersion: z.string(),
  }),
  operations: z.array(
    z.object({
      opId: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      operation: z.string(),
      payload: z.record(z.string(), z.unknown()),
      createdAt: z.string(),
      createdBy: z.string(),
      baseVersion: z.number().int().nonnegative(),
      correlationId: z.string().optional(),
    }),
  ),
});

router.post(
  '/import',
  createRateLimit,
  authenticate,
  requirePermissions(['sync:import']),
  validateBody(syncImportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await syncService.import(
        req.body,
        req.user?.id ?? null,
        req.correlationId ?? '',
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
