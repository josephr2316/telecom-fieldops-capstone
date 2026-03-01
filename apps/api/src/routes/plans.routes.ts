import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { plansService } from '../domain/services/plans.service';
import { validateBody, validateParams } from '../middleware/validate';

const router = Router();

const planTypeSchema = z.enum(['HOME_INTERNET', 'MOBILE_DATA', 'VOICE', 'TV', 'BUSINESS']);
const currencySchema = z.enum(['DOP', 'USD']);
const categorySchema = z.enum(['RESIDENCIAL', 'MOVIL', 'EMPRESARIAL', 'TV']);
const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const planIdParamsSchema = z.object({
  id: z.string().min(1),
});

const createPlanSchema = z.object({
  name: z.string().min(1),
  type: planTypeSchema,
  price: z.number().nonnegative(),
  currency: currencySchema,
  isActive: z.boolean().optional(),
  description: z.string().min(1).optional(),
  category: categorySchema.optional(),
  downloadSpeedMbps: z.number().int().nonnegative().nullable().optional(),
  uploadSpeedMbps: z.number().int().nonnegative().nullable().optional(),
  dataLimitGB: z.number().int().nonnegative().nullable().optional(),
});

const updatePlanSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: planTypeSchema.optional(),
    price: z.number().nonnegative().optional(),
    currency: currencySchema.optional(),
    isActive: z.boolean().optional(),
    description: z.string().min(1).optional(),
    category: categorySchema.optional(),
    status: statusSchema.optional(),
    monthlyPrice: z.number().nonnegative().optional(),
    downloadSpeedMbps: z.number().int().nonnegative().nullable().optional(),
    uploadSpeedMbps: z.number().int().nonnegative().nullable().optional(),
    dataLimitGB: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

/** GET /plans: list all plans. */
router.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await plansService.listPlans();
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

/** GET /plans/:id: get plan by id. */
router.get('/plans/:id', validateParams(planIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await plansService.getPlanById(req.params.id);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

/** POST /plans: create plan. */
router.post('/plans', validateBody(createPlanSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await plansService.createPlan(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/** PATCH /plans/:id: update plan. */
router.patch(
  '/plans/:id',
  validateParams(planIdParamsSchema),
  validateBody(updatePlanSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await plansService.updatePlan(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

/** PATCH /plans/:id/activate: set plan active. */
router.patch('/plans/:id/activate', validateParams(planIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await plansService.activatePlan(req.params.id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/** PATCH /plans/:id/deactivate: set plan inactive. */
router.patch('/plans/:id/deactivate', validateParams(planIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await plansService.deactivatePlan(req.params.id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/** DELETE /plans/:id: delete plan. */
router.delete('/plans/:id', validateParams(planIdParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await plansService.deletePlan(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
