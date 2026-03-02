import { roleRepo } from '../../infra/repositories/role.repo';

/** Role service: list roles and get permission keys by role ids. All methods async. */
export const roleService = {
  async listRoles() {
    return roleRepo.listAll();
  },
  async getPermissionKeysForUser(roleIds: string[]): Promise<string[]> {
    return roleRepo.getPermissionKeysByRoleIds(roleIds);
  },
};