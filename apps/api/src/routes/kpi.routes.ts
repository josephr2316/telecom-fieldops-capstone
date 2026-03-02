import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/rbac';
import { kpiService } from '../domain/services/kpi.service';

export function kpiRouter() {
  const router = Router();

  router.use(authenticate);
  router.use(requirePermissions(['kpis:read']));

  router.get('/dashboard/kpis', async (_req, res, next) => {
    try {
      const data = await kpiService.getDashboardKpis();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  });

  router.get('/kpis/summary', async (_req, res, next) => {
    try {
      const data = await kpiService.getDashboardKpis();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

const router = kpiRouter();

export default router;
