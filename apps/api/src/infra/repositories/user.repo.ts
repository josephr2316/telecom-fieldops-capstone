import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma/prismaClient';
import type { RefreshTokenRecord, Role, User } from '../../domain/models/types';

/** Normalizes email to lowercase and trimmed for consistent lookups. */
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Maps a Prisma User row to the domain User type (excludes createdAt/updatedAt). */
function toDomainUser(row: {
  id: string;
  email: string;
  passwordHash: string;
  blocked: boolean;
  roles: string[];
}): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    blocked: row.blocked,
    roles: row.roles,
  };
}

/** Maps a Prisma Role row to the domain Role type; permissionKeys JSON is normalized to string[]. */
function toDomainRole(row: { id: string; name: string; permissionKeys: unknown }): Role {
  const keys = Array.isArray(row.permissionKeys) ? row.permissionKeys : [];
  return { id: row.id, name: row.name, permissionKeys: keys as string[] };
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  blocked?: boolean;
  roles: string[];
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  blocked?: boolean;
  roles?: string[];
}

/**
 * User and role repository backed by Prisma (PostgreSQL).
 * All methods are async and return Promises.
 */
export const userRepository = {
  /** Returns all users ordered by creation date. */
  async listUsers(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toDomainUser);
  },

  /** Finds a user by id; returns null if not found. */
  async findById(id: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toDomainUser(row) : null;
  },

  /** Finds a user by normalized email; returns null if not found. */
  async findByEmail(email: string): Promise<User | null> {
    const target = normalizeEmail(email);
    const row = await prisma.user.findUnique({ where: { email: target } });
    return row ? toDomainUser(row) : null;
  },

  /** Creates a new user with a generated id; returns the created domain user. */
  async create(input: CreateUserInput): Promise<User> {
    const id = `usr-${uuidv4()}`;
    const created = await prisma.user.create({
      data: {
        id,
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        blocked: input.blocked ?? false,
        roles: input.roles,
      },
    });
    return toDomainUser(created);
  },

  /** Updates an existing user by id; returns null if user does not exist. */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.email != null && { email: normalizeEmail(input.email) }),
        ...(input.passwordHash != null && { passwordHash: input.passwordHash }),
        ...(typeof input.blocked === 'boolean' && { blocked: input.blocked }),
        ...(input.roles != null && { roles: input.roles }),
      },
    });
    return toDomainUser(updated);
  },

  /** Sets user blocked to true; returns updated user or null if not found. */
  async block(id: string): Promise<User | null> {
    return this.update(id, { blocked: true });
  },

  /** Returns all roles. */
  async listRoles(): Promise<Role[]> {
    const rows = await prisma.role.findMany();
    return rows.map(toDomainRole);
  },

  /** Finds a role by name; returns null if not found. */
  async findRoleByName(name: string): Promise<Role | null> {
    const row = await prisma.role.findUnique({ where: { name } });
    return row ? toDomainRole(row) : null;
  },

  /** Returns true if every role name exists in the database. */
  async validateRoleNames(roleNames: string[]): Promise<boolean> {
    for (const name of roleNames) {
      const role = await this.findRoleByName(name);
      if (!role) return false;
    }
    return true;
  },

  /** Aggregates all permission keys for the given role names (no duplicates). */
  async getPermissionKeysForRoles(roleNames: string[]): Promise<string[]> {
    const keys = new Set<string>();
    for (const roleName of roleNames) {
      const role = await this.findRoleByName(roleName);
      if (!role) continue;
      for (const permission of role.permissionKeys) {
        keys.add(permission);
      }
    }
    return Array.from(keys);
  },

  /** Persists a revoked refresh token record (upsert by jti). */
  async revokeRefreshToken(record: RefreshTokenRecord): Promise<void> {
    await prisma.revokedRefreshToken.upsert({
      where: { jti: record.jti },
      create: {
        jti: record.jti,
        userId: record.userId,
        exp: BigInt(record.exp),
        revokedAt: new Date(),
      },
      update: {},
    });
  },

  /** Returns true if the given jti has been revoked. */
  async isRefreshTokenRevoked(jti: string): Promise<boolean> {
    const row = await prisma.revokedRefreshToken.findUnique({ where: { jti } });
    return row != null;
  },
};
