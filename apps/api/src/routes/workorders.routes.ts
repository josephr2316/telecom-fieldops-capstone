import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../domain/errors/apiError';
import { workOrderService } from '../domain/services/workorder.service';
import { authenticate } from '../middleware/auth';
import { requirePermissions, requireAnyPermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { workOrderController } from '../presentation/controllers/workOrder.controller';

const router = Router();

const WORK_ORDER_TYPES = [
  'NEW_SERVICE_INSTALL',
  'CLAIM_TROUBLESHOOT',
  'PLAN_AND_EQUIPMENT_SALE',
  'EQUIPMENT_ONLY_SALE',
  'MONTHLY_PAYMENT',
  'SERVICE_UPGRADE',
  'SERVICE_DOWN_OUTAGE',
] as const;

const workOrderIdParams = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  type: z.enum(WORK_ORDER_TYPES),
  customerId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  items: z.array(
    z.object({ productId: z.string().min(1), qty: z.number().int().positive() }),
  ).optional(),
});

const updateStatusSchema = z.object({
  newStatus: z.string().min(1),
  baseVersion: z.number().int().nonnegative(),
});

const assignSchema = z.object({
  assignedTechUserId: z.string().min(1).nullable(),
});

const checklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  completed: z.boolean(),
});

const techDetailsSchema = z.object({
  technicianNotes: z.string().nullable().optional(),
  checklist: z.array(checklistItemSchema).nullable().optional(),
});

router.use(authenticate);

router.get(
  '/',
  requireAnyPermission(['workorders:read', 'workorders:view-own']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hasReadAll = req.user?.permissions?.some((p) => p === 'workorders:read' || p === 'workorders:*');
      const assignedToUserId = hasReadAll ? undefined : req.user?.id;
      const list = await workOrderService.listWorkOrders(assignedToUserId);
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  requireAnyPermission(['workorders:read', 'workorders:view-own']),
  validateParams(workOrderIdParams),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wo = await workOrderService.getWorkOrder(req.params.id);
      if (!wo) {
        res.status(404).json({ message: 'Work order not found' });
        return;
      }
      const hasReadAll = req.user?.permissions?.some((p) => p === 'workorders:read' || p === 'workorders:*');
      if (!hasReadAll && wo.assignedTechUserId !== req.user?.id) {
        res.status(404).json({ message: 'Work order not found' });
        return;
      }
      res.status(200).json(wo);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requirePermissions(['workorders:create']),
  validateBody(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await workOrderService.createWorkOrder(
        req.body,
        req.user?.id ?? null,
        req.correlationId,
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/status',
  requirePermissions(['workorders:update-state']),
  validateParams(workOrderIdParams),
  validateBody(updateStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await workOrderService.updateStatus(
        req.params.id,
        req.body,
        req.user?.id ?? null,
        req.correlationId,
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// additional endpoint for direct state transition with validation (controller method)
router.patch("/:id/state", workOrderController.transitionState.bind(workOrderController));

router.patch(
  '/:id/assign',
  requireAnyPermission(['workorders:assign', 'workorders:*']),
  validateParams(workOrderIdParams),
  validateBody(assignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await workOrderService.assignTech(
        req.params.id,
        req.body.assignedTechUserId,
        req.user?.id ?? null,
        req.correlationId,
      );
      if (!updated) {
        res.status(404).json({ message: 'Work order not found' });
        return;
      }
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/tech-details',
  requirePermissions(['workorders:update-state']),
  validateParams(workOrderIdParams),
  validateBody(techDetailsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await workOrderService.updateTechDetails(
        req.params.id,
        req.body,
        req.user?.id ?? null,
      );
      if (!updated) {
        res.status(404).json({ message: 'Work order not found' });
        return;
      }
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
