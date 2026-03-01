/**
 * Seeds work orders from scripts/seed-data.json into the database.
 * Run from apps/api:
 *   npx ts-node --transpile-only -r dotenv/config scripts/seed-work-orders.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/infra/db/prisma/prismaClient';

interface SeedWorkOrder {
  id: string;
  type: string;
  status: string;
  customerId: string;
  branchId?: string;
  planId?: string;
  assignedTechUserId?: string;
  version: number;
  items: Array<{ productId: string; qty: number }>;
  createdAt: string;
  updatedAt: string;
}

async function main() {
  const seedPath = path.resolve(__dirname, '../../scripts/seed-data.json');
  if (!fs.existsSync(seedPath)) {
    console.warn('seed-data.json not found at', seedPath);
    process.exit(0);
  }
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const data = JSON.parse(raw) as { workOrders?: SeedWorkOrder[] };
  const workOrders = data.workOrders ?? [];
  if (workOrders.length === 0) {
    console.log('No work orders in seed-data.json.');
    process.exit(0);
  }

  for (const wo of workOrders) {
    await prisma.workOrder.upsert({
      where: { id: wo.id },
      create: {
        id: wo.id,
        type: wo.type,
        status: wo.status,
        customerId: wo.customerId,
        branchId: wo.branchId ?? null,
        planId: wo.planId ?? null,
        assignedTechUserId: wo.assignedTechUserId ?? null,
        version: wo.version,
        items: (wo.items ?? []) as object,
      },
      update: {
        type: wo.type,
        status: wo.status,
        customerId: wo.customerId,
        branchId: wo.branchId ?? null,
        planId: wo.planId ?? null,
        assignedTechUserId: wo.assignedTechUserId ?? null,
        version: wo.version,
        items: (wo.items ?? []) as object,
      },
    });
  }
  console.log('Seeded', workOrders.length, 'work order(s).');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
