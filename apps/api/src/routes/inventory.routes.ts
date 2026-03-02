import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { inventoryService } from '../domain/services/invetory.service';
import { validateBody, validateParams, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/rbac';


export function inventoryRouter() {

const router = Router();

// all inventory operations require authentication
router.use(authenticate);

const inventoryQuerySchema = z.object({
  branchId: z.string().min(1),
});

const reserveInventorySchema = z.object({
  workOrderId: z.string().min(1),
  branchId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().int().positive(),
  })).min(1),
});

const releaseReservationParamsSchema = z.object({
  workOrderId: z.string().min(1),
});

/** GET /inventory/branches: list all branches. */
router.get('/inventory/branches', requirePermissions(['inventory:read']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json(await inventoryService.listBranches());
  } catch (error) {
    next(error);
  }
});

/** GET /inventory/products: list all products. */
router.get('/inventory/products', requirePermissions(['inventory:read']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json(await inventoryService.listProducts());
  } catch (error) {
    next(error);
  }
});

/** GET /inventory?branchId=: list inventory for a branch. */
router.get('/inventory', requirePermissions(['inventory:read']), validate(inventoryQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = String(req.query.branchId);
    res.status(200).json(await inventoryService.listInventory(branchId));
  } catch (error) {
    next(error);
  }
});

/** POST /inventory/reservations: reserve stock for a work order. */
router.post('/inventory/reservations', validateBody(reserveInventorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.reserveForRequest({
      workOrderId: req.body.workOrderId,
      branchId: req.body.branchId,
      items: req.body.items,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** DELETE /inventory/reservations/:workOrderId: release reservation. */
router.delete('/inventory/reservations/:workOrderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.releaseForRequest(req.params.workOrderId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

return router;

}