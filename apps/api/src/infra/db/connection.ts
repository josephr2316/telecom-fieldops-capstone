import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import type { AuditEvent, RefreshTokenRecord, Role, User } from '../../domain/models/types';

export interface InMemoryDatabase {
  users: Map<string, User>;
  roles: Map<string, Role>;
  audits: AuditEvent[];
  revokedRefreshTokens: Map<string, RefreshTokenRecord>;
}

type SeedAuth = { authRoles?: Role[]; authUsers?: User[] };

function loadAuthFromSeed(): { roles: Role[]; users: User[] } | null {
  const candidates = [
    process.env.SEED_DATA_PATH,
    path.resolve(__dirname, '../../../../../../scripts/seed-data.json'), // dist/infra/db -> repo root
    path.resolve(__dirname, '../../../../../scripts/seed-data.json'),    // src/infra/db (Jest) -> repo root
    path.resolve(__dirname, '../../../scripts/seed-data.json'),        // container: /app/dist/infra/db
    path.resolve(process.cwd(), '../../scripts/seed-data.json'),       // from apps/api -> repo root
  ].filter(Boolean) as string[];

  for (const seedPath of candidates) {
    try {
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf-8');
        const data = JSON.parse(raw) as SeedAuth;
        if (
          Array.isArray(data.authRoles) &&
          data.authRoles.length > 0 &&
          Array.isArray(data.authUsers) &&
          data.authUsers.length > 0
        ) {
          return { roles: data.authRoles, users: data.authUsers };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Fallback cuando el seed no existe (ej. producción Railway sin scripts/). Misma data que authUsers/authRoles del seed. */
const createDefaultRoles = (): Role[] => [
  { id: 'role-admin', name: 'admin', permissionKeys: ['*'] },
  { id: 'role-tecnico', name: 'tecnico', permissionKeys: ['workorders:view-own', 'workorders:update-state'] },
  { id: 'role-supervisor', name: 'supervisor', permissionKeys: ['workorders:*', 'inventory:view'] },
  { id: 'role-ventas', name: 'ventas', permissionKeys: ['workorders:create', 'inventory:reserve'] },
];

const hashPassword = (plain: string): string => bcrypt.hashSync(plain, env.auth.bcryptRounds);

const createDefaultUsers = (): User[] => [
  { id: 'usr-admin-01', email: 'admin@telecom.local', passwordHash: hashPassword('Admin123!'), blocked: false, roles: ['admin'] },
  { id: 'usr-tecnico-01', email: 'tecnico@telecom.local', passwordHash: hashPassword('Tecnico123!'), blocked: false, roles: ['tecnico'] },
  { id: 'usr-supervisor-01', email: 'supervisor@telecom.local', passwordHash: hashPassword('Supervisor123!'), blocked: false, roles: ['supervisor'] },
  { id: 'usr-ventas-01', email: 'ventas@telecom.local', passwordHash: hashPassword('Ventas123!'), blocked: false, roles: ['ventas'] },
];

const buildSeededDatabase = (): InMemoryDatabase => {
  const db: InMemoryDatabase = {
    users: new Map<string, User>(),
    roles: new Map<string, Role>(),
    audits: [],
    revokedRefreshTokens: new Map<string, RefreshTokenRecord>(),
  };

  const seed = loadAuthFromSeed();
  if (seed) {
    for (const role of seed.roles) {
      db.roles.set(role.id, role);
    }
    for (const user of seed.users) {
      db.users.set(user.id, { ...user, email: user.email.trim().toLowerCase() });
    }
  } else {
    for (const role of createDefaultRoles()) {
      db.roles.set(role.id, role);
    }
    for (const user of createDefaultUsers()) {
      db.users.set(user.id, user);
    }
  }

  return db;
};

let database = buildSeededDatabase();

export const getDb = (): InMemoryDatabase => database;

export const resetDb = (): InMemoryDatabase => {
  database = buildSeededDatabase();
  return database;
};
