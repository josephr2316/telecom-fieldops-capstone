import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from '../../routes/auth.routes';
import { auditRouter } from '../../routes/audit.routes';
import { inventoryRouter } from '../../routes/inventory.routes';
import { kpiRouter } from '../../routes/kpi.routes';
import plansRouter from '../../routes/plans.routes';
import productsRouter from '../../routes/products.routes';
import usersRouter from '../../routes/users.routes';
import rolesRouter from '../../routes/roles.route';
import workOrdersRouter from '../../routes/workorders.routes';
import { authenticate } from '../../middleware/auth';
import { requirePermissions } from '../../middleware/rbac';

export function buildApiRouter() {
  const router = Router();

  router.use(healthRouter());
  router.use('/catalog', plansRouter);
  router.use('/catalog', productsRouter);
  router.use('/auth', authRouter());
  router.use(inventoryRouter());
  router.use('/work-orders', workOrdersRouter);
  router.use(kpiRouter());
  router.use('/users', usersRouter);
  router.use('/roles', rolesRouter);
  router.use('/audit', authenticate, requirePermissions(['audit:read']), auditRouter());

  return router;
}

export default buildApiRouter;
