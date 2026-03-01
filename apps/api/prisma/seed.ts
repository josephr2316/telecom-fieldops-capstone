/**
 * One-time seed: loads initial data from scripts/seed-data.json into the database.
 *
 * - This script is NOT run when the application starts. It runs only when you
 *   explicitly execute: npx prisma db seed (from apps/api).
 * - It is safe to run only when the database is empty (or you set RUN_SEED=force).
 *   If users already exist, seeding is skipped to avoid duplicate data.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/infra/db/prisma/prismaClient';

const seedPath = path.resolve(__dirname, '../../../scripts/seed-data.json');
if (!fs.existsSync(seedPath)) {
  console.warn('seed-data.json not found at', seedPath);
  process.exit(0);
}

const raw = fs.readFileSync(seedPath, 'utf-8');
const data = JSON.parse(raw) as {
  authRoles?: Array<{ id: string; name: string; permissionKeys: string[] }>;
  authUsers?: Array<{ id: string; email: string; passwordHash: string; blocked: boolean; roles: string[] }>;
  branches?: Array<{ id: string; name: string; isMain: boolean }>;
  plans?: Array<{
    id: string;
    name: string;
    type: string;
    price: number;
    currency: string;
    isActive: boolean;
  }>;
  products?: Array<{ id: string; name: string; category: string; isSerialized: boolean }>;
  inventory?: Array<{
    id: string;
    branchId: string;
    productId: string;
    qtyAvailable: number;
    qtyReserved: number;
  }>;
  workOrders?: Array<{
    id: string;
    type: string;
    status: string;
    customerId: string;
    branchId?: string;
    planId?: string;
    assignedTechUserId?: string;
    version: number;
    items: Array<{ productId: string; qty: number }>;
    technicianNotes?: string;
    checklist?: Array<{ id: string; label: string; completed: boolean }>;
  }>;
};

async function main() {
  const authUsers = data.authUsers ?? [];
  if (authUsers.length > 0) {
    const existingCount = await prisma.user.count({
      where: { id: { in: authUsers.map((u) => u.id) } },
    });
    if (existingCount > 0 && process.env.RUN_SEED !== 'force') {
      console.log(
        'Seed already applied (seed users exist). Skipping to avoid duplicate data. Set RUN_SEED=force to run anyway.',
      );
      return;
    }
  }

  console.log('Seeding database from seed-data.json...');

  // 1) Roles (authRoles -> roles table for API auth)
  const roles = data.authRoles ?? [];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      create: { id: r.id, name: r.name, permissionKeys: r.permissionKeys ?? [] },
      update: { name: r.name, permissionKeys: r.permissionKeys ?? [] },
    });
  }
  console.log('  roles:', roles.length);

  // 2) Users (authUsers -> users table for API auth)
  const users = data.authUsers ?? [];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email.trim().toLowerCase(),
        passwordHash: u.passwordHash,
        blocked: u.blocked ?? false,
        roles: u.roles ?? [],
      },
      update: {
        email: u.email.trim().toLowerCase(),
        passwordHash: u.passwordHash,
        blocked: u.blocked ?? false,
        roles: u.roles ?? [],
      },
    });
  }
  console.log('  users:', users.length);

  // 3) Branches
  const branches = data.branches ?? [];
  for (const b of branches) {
    await prisma.branch.upsert({
      where: { id: b.id },
      create: { id: b.id, name: b.name, isMain: b.isMain ?? false },
      update: { name: b.name, isMain: b.isMain ?? false },
    });
  }
  console.log('  branches:', branches.length);

  // 4) Plans (seed has price; schema needs description, category, status, monthlyPrice)
  const plans = data.plans ?? [];
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        type: p.type,
        price: p.price,
        currency: p.currency,
        isActive: p.isActive ?? true,
        description: '',
        category: p.type || 'RESIDENCIAL',
        status: p.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        monthlyPrice: p.price,
      },
      update: {
        name: p.name,
        type: p.type,
        price: p.price,
        currency: p.currency,
        isActive: p.isActive ?? true,
        description: '',
        category: p.type || 'RESIDENCIAL',
        status: p.isActive !== false ? 'ACTIVE' : 'INACTIVE',
        monthlyPrice: p.price,
      },
    });
  }
  console.log('  plans:', plans.length);

  // 5) Products
  const products = data.products ?? [];
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        category: p.category,
        isSerialized: p.isSerialized ?? false,
      },
      update: { name: p.name, category: p.category, isSerialized: p.isSerialized ?? false },
    });
  }
  console.log('  products:', products.length);

  // 6) Inventory (after branches and products)
  const inventory = data.inventory ?? [];
  for (const inv of inventory) {
    await prisma.inventory.upsert({
      where: { id: inv.id },
      create: {
        id: inv.id,
        branchId: inv.branchId,
        productId: inv.productId,
        qtyAvailable: inv.qtyAvailable ?? 0,
        qtyReserved: inv.qtyReserved ?? 0,
      },
      update: {
        branchId: inv.branchId,
        productId: inv.productId,
        qtyAvailable: inv.qtyAvailable ?? 0,
        qtyReserved: inv.qtyReserved ?? 0,
      },
    });
  }
  console.log('  inventory:', inventory.length);

  // 7) Work orders: rellenar nulls, vacíos e inválidos con valores reales de seed-data.
  // Solo son válidos: customer_id (cust_001,cust_002,cust_003), branch_id (br_main,br_east,br_west), plan_id (plan_*).
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET technician_notes = COALESCE(technician_notes, '') WHERE technician_notes IS NULL
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET technician_notes = 'Orden en proceso. Pendiente de notas del técnico.' WHERE TRIM(technician_notes) = ''
    `);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET checklist = COALESCE(checklist, '[]'::jsonb) WHERE checklist IS NULL
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET checklist = '[{"id":"1","label":"Verificar equipo en sitio","completed":false},{"id":"2","label":"Comprobar señal","completed":false},{"id":"3","label":"Documentar resultado","completed":false}]'::jsonb WHERE checklist = '[]'::jsonb OR jsonb_array_length(checklist) = 0
    `);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET items = COALESCE(items, '[]'::jsonb) WHERE items IS NULL
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET items = '[{"productId":"prod_router_ax","qty":1}]'::jsonb WHERE items = '[]'::jsonb OR jsonb_array_length(items) = 0
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET assigned_tech_user_id = 'usr-tecnico-01' WHERE assigned_tech_user_id IS NULL OR assigned_tech_user_id NOT IN ('usr-admin-01','usr-tecnico-01','usr-supervisor-01','usr-ventas-01','usr-security-01')
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET customer_id = 'cust_001' WHERE customer_id IS NULL OR TRIM(customer_id) = '' OR customer_id NOT IN ('cust_001','cust_002','cust_003')
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET branch_id = 'br_main' WHERE branch_id IS NULL OR TRIM(branch_id) = '' OR branch_id NOT IN ('br_main','br_east','br_west')
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE work_orders SET plan_id = 'plan_home_200' WHERE plan_id IS NULL OR TRIM(plan_id) = '' OR plan_id NOT IN ('plan_home_200','plan_home_500','plan_mobile_20gb','plan_voice_600','plan_business_1g')
    `);
  } catch {}

  // 8) Work orders (technicianNotes, checklist e items siempre con valor; nunca null)
  const workOrders = data.workOrders ?? [];
  for (const wo of workOrders) {
    const notes = (wo.technicianNotes != null && wo.technicianNotes !== '') ? wo.technicianNotes : '';
    const checklistData = Array.isArray(wo.checklist) ? (wo.checklist as object) : [];
    const itemsData = Array.isArray(wo.items) ? (wo.items as object) : [];
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
        version: wo.version ?? 0,
        items: itemsData,
        technicianNotes: notes,
        checklist: checklistData,
      },
      update: {
        type: wo.type,
        status: wo.status,
        customerId: wo.customerId,
        branchId: wo.branchId ?? null,
        planId: wo.planId ?? null,
        assignedTechUserId: wo.assignedTechUserId ?? null,
        version: wo.version ?? 0,
        items: itemsData,
        technicianNotes: notes,
        checklist: checklistData,
      },
    });
  }
  console.log('  workOrders:', workOrders.length);

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
