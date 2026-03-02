import { Router } from 'express';
import { z } from 'zod';
import { userService } from '../domain/services/user.service';
import { authenticate } from '../middleware/auth';
import { createRateLimit } from '../middleware/rateLimit';
import { requirePermissions } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { logger } from '../infra/logger/logger';

const router = Router();

const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  roles: z.array(z.string().min(1)).min(1),
});

const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).max(128).optional(),
    roles: z.array(z.string().min(1)).min(1).optional(),
    blocked: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

router.use(authenticate);

/** GET /: list users (public DTOs). */
router.get('/', requirePermissions(['users:read']), async (req, res, next) => {
  try {
    const users = await userService.listUsers();
    res.status(200).json(users);

    logger.info('Users listed', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      action: 'USERS_LIST',
    });
  } catch (error) {
    next(error);
  }
});

/** POST /: create user. */
router.post(
  '/',
  createRateLimit,
  requirePermissions(['users:create']),
  validateBody(createUserSchema),
  async (req, res, next) => {
    try {
      const created = await userService.createUser(req.body, req.user!.id, req.correlationId);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

/** PATCH /:id: update user. */
router.patch(
  '/:id',
  requirePermissions(['users:update']),
  validateParams(userIdParamsSchema),
  validateBody(updateUserSchema),
  async (req, res, next) => {
    try {
      const updated = await userService.updateUser(
        req.params.id,
        req.body,
        req.user!.id,
        req.correlationId,
      );
      if (Array.isArray(req.body.roles)) {
        logger.info('Roles assigned', {
          correlationId: req.correlationId,
          userId: req.user?.id,
          action: 'ROLEASSIGNED',
          targetUserId: req.params.id,
        });
      }
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

/** POST /:id/block: block user. */
router.post(
  '/:id/block',
  requirePermissions(['users:block']),
  validateParams(userIdParamsSchema),
  async (req, res, next) => {
    try {
      const blocked = await userService.blockUser(req.params.id, req.user!.id, req.correlationId);
      logger.info('User blocked', {
        correlationId: req.correlationId,
        userId: req.user?.id,
        action: 'USERBLOCKED',
        blockedUserId: req.params.id,
      });
      res.status(200).json(blocked);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
