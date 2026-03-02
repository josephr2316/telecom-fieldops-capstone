import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { AUDIT_ACTIONS, type UserPublic } from '../models/types';
import { ApiError } from '../errors/apiError';
import { userRepository } from '../../infra/repositories/user.repo';
import { auditService } from './audit.service';

export interface CreateUserPayload {
  email: string;
  password: string;
  roles: string[];
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  roles?: string[];
  blocked?: boolean;
}

/** Maps internal user shape to public API response (no passwordHash). */
const toPublicUser = (input: {
  id: string;
  email: string;
  blocked: boolean;
  roles: string[];
}): UserPublic => ({
  id: input.id,
  email: input.email,
  blocked: input.blocked,
  roles: [...input.roles],
});

/**
 * User management service: list, create, update, block, permissions.
 * All methods are async and use the Prisma-backed user repository.
 */
export const userService = {
  /** Returns all users as public DTOs. */
  async listUsers(): Promise<UserPublic[]> {
    const users = await userRepository.listUsers();
    return users.map(toPublicUser);
  },

  /** Returns all roles. */
  async listRoles() {
    return userRepository.listRoles();
  },

  /** Creates a new user; throws on duplicate email or invalid roles. */
  async createUser(payload: CreateUserPayload): Promise<UserPublic> {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) {
      throw new ApiError(
        409,
        'Conflict',
        'A user with the same email already exists.',
        'urn:telecom:error:user-conflict',
      );
    }

    if (!(await userRepository.validateRoleNames(payload.roles))) {
      throw new ApiError(
        409,
        'Conflict',
        'One or more roles do not exist.',
        'urn:telecom:error:role-missing',
      );
    }

    const passwordHash = bcrypt.hashSync(payload.password, env.auth.bcryptRounds);
    const created = await userRepository.create({
      email: payload.email,
      passwordHash,
      roles: payload.roles,
      blocked: false,
    });
    return toPublicUser(created);
  },

  /** Updates a user by id; throws 404 if not found, 409 on duplicate email or invalid roles. */
  async updateUser(
    userId: string,
    payload: UpdateUserPayload,
    actorUserId: string,
    correlationId: string,
  ): Promise<UserPublic> {
    const previous = await userRepository.findById(userId);
    if (!previous) {
      throw new ApiError(404, 'Not Found', 'User not found.', 'urn:telecom:error:user-not-found');
    }

    if (payload.email && payload.email !== previous.email) {
      const existingWithEmail = await userRepository.findByEmail(payload.email);
      if (existingWithEmail && existingWithEmail.id !== userId) {
        throw new ApiError(
          409,
          'Conflict',
          'A user with the same email already exists.',
          'urn:telecom:error:user-conflict',
        );
      }
    }

    if (payload.roles && !(await userRepository.validateRoleNames(payload.roles))) {
      throw new ApiError(
        409,
        'Conflict',
        'One or more roles do not exist.',
        'urn:telecom:error:role-missing',
      );
    }

    const updated = await userRepository.update(userId, {
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.password
        ? { passwordHash: bcrypt.hashSync(payload.password, env.auth.bcryptRounds) }
        : {}),
      ...(typeof payload.blocked === 'boolean' ? { blocked: payload.blocked } : {}),
      ...(payload.roles ? { roles: payload.roles } : {}),
    });

    if (!updated) {
      throw new ApiError(404, 'Not Found', 'User not found.', 'urn:telecom:error:user-not-found');
    }

    const rolesChanged =
      Array.isArray(payload.roles) &&
      (payload.roles.length !== previous.roles.length ||
        payload.roles.some((role, idx) => role !== previous.roles[idx]));

    if (rolesChanged) {
      await auditService.record({
        actorUserId,
        action: AUDIT_ACTIONS.ROLE_ASSIGNED,
        entityType: 'user',
        entityId: userId,
        before: { roles: previous.roles },
        after: { roles: updated.roles },
        correlationId,
      });
    }

    return toPublicUser(updated);
  },

  /** Blocks a user and records audit event; throws 404 if not found. */
  async blockUser(userId: string, actorUserId: string, correlationId: string): Promise<UserPublic> {
    const previous = await userRepository.findById(userId);
    if (!previous) {
      throw new ApiError(404, 'Not Found', 'User not found.', 'urn:telecom:error:user-not-found');
    }

    const updated = await userRepository.block(userId);

    if (!updated) {
      throw new ApiError(404, 'Not Found', 'User not found.', 'urn:telecom:error:user-not-found');
    }

    await auditService.record({
      actorUserId,
      action: AUDIT_ACTIONS.USER_BLOCKED,
      entityType: 'user',
      entityId: userId,
      before: { blocked: previous.blocked },
      after: { blocked: updated.blocked },
      correlationId,
    });

    return toPublicUser(updated);
  },

  /** Returns permission keys for the given user; empty array if user not found. */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await userRepository.findById(userId);
    if (!user) {
      return [];
    }
    return userRepository.getPermissionKeysForRoles(user.roles);
  },
};
