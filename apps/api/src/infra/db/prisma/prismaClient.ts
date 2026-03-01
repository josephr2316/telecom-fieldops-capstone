import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma';

let connectionString = process.env.DATABASE_URL ?? '';
if (!connectionString) {
  throw new Error('DATABASE_URL must be set for Prisma');
}

// Supabase transaction pooler (puerto 6543) no admite PREPARE statements; Prisma sí los usa por defecto.
// Sin pgbouncer=true el login y otras queries fallan con 500.
const isSupabasePooler =
  /pooler\.supabase\.com/i.test(connectionString) && /:6543[/?]/.test(connectionString);
if (isSupabasePooler) {
  const sep = connectionString.includes('?') ? '&' : '?';
  const params: string[] = [];
  if (!/pgbouncer=true/i.test(connectionString)) params.push('pgbouncer=true');
  // Evitar "self-signed certificate in certificate chain": pg trata sslmode=require como verify-full.
  // uselibpqcompat=true usa semántica libpq (require = cifrar sin verificar CA), compatible con Supabase.
  if (!/uselibpqcompat=true/i.test(connectionString)) params.push('uselibpqcompat=true');
  if (params.length) connectionString = `${connectionString}${sep}${params.join('&')}`;
}

const adapter = new PrismaPg({ connectionString });

/** Singleton: reuse one PrismaClient per process. In dev (HMR), attach to globalThis to avoid "too many connections". */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
