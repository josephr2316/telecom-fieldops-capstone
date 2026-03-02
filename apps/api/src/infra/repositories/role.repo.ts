import { prisma } from '../db/prisma/prismaClient';
import type { Role } from '../../domain/models/types';

/** Maps a Prisma Role row to the domain Role type (permissionKeys JSON -> string[]). */
function toDomainRole(row: { id: string; name: string; permissionKeys: unknown }): Role {
  const keys = Array.isArray(row.permissionKeys) ? row.permissionKeys : [];
  return { id: row.id, name: row.name, permissionKeys: keys as string[] };
}

/**
 * Roles repository backed by Prisma (PostgreSQL).
 * All methods are async. For role-by-name and permissions by role names use userRepository.
 */
export function roleRepository() {
  return {
    /** Returns all roles. */
    async listAll(): Promise<Role[]> {
      const rows = await prisma.role.findMany();
      return rows.map(toDomainRole);
    },

    /** Finds a role by id; returns undefined if not found. */
    async findById(id: string): Promise<Role | undefined> {
      const row = await prisma.role.findUnique({ where: { id } });
      return row ? toDomainRole(row) : undefined;
    },

    /** Aggregates permission keys for the given role ids (no duplicates). */
    async getPermissionKeysByRoleIds(roleIds: string[]): Promise<string[]> {
      const set = new Set<string>();
      for (const roleId of roleIds) {
        const row = await prisma.role.findUnique({ where: { id: roleId } });
        if (row) {
          const keys = Array.isArray(row.permissionKeys) ? row.permissionKeys : [];
          keys.forEach((k) => set.add(k as string));
        }
      }
      return Array.from(set);
    },
  };
}

/** Singleton instance for backward compatibility. */
export const roleRepo = roleRepository();
