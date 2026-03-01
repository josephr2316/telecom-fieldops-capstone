/**
 * Verifies that Prisma can read from and write to the database.
 * Run from apps/api:
 *   npx ts-node --transpile-only -r dotenv/config scripts/verify-db-persistence.ts
 * If you get TLS/SSL errors (e.g. Supabase self-signed cert), run with:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx ts-node --transpile-only -r dotenv/config scripts/verify-db-persistence.ts
 * (Only for local/dev; do not disable TLS verification in production.)
 */
import 'dotenv/config';
import { prisma } from '../src/infra/db/prisma/prismaClient';

const TEST_ROLE_ID = 'verify-db-role-temp';

async function main() {
  console.log('Verifying database persistence...\n');

  // 1) Read counts from existing tables
  const [rolesCount, usersCount, plansCount, productsCount, branchesCount, inventoryCount, auditsCount] =
    await Promise.all([
      prisma.role.count(),
      prisma.user.count(),
      prisma.plan.count(),
      prisma.product.count(),
      prisma.branch.count(),
      prisma.inventory.count(),
      prisma.audit.count(),
    ]);

  console.log('Current row counts:');
  console.log('  roles:', rolesCount);
  console.log('  users:', usersCount);
  console.log('  plans:', plansCount);
  console.log('  products:', productsCount);
  console.log('  branches:', branchesCount);
  console.log('  inventory:', inventoryCount);
  console.log('  audits:', auditsCount);

  // 2) Write: create a temporary role
  await prisma.role.create({
    data: {
      id: TEST_ROLE_ID,
      name: `verify_${Date.now()}`,
      permissionKeys: [],
    },
  });
  console.log('\nCreated temporary role:', TEST_ROLE_ID);

  // 3) Read back the role
  const found = await prisma.role.findUnique({ where: { id: TEST_ROLE_ID } });
  if (!found) {
    throw new Error('Write verification failed: could not read back the created role');
  }
  console.log('Read back role:', found.name);

  // 4) Delete the temporary role
  await prisma.role.delete({ where: { id: TEST_ROLE_ID } });
  console.log('Deleted temporary role.');

  const gone = await prisma.role.findUnique({ where: { id: TEST_ROLE_ID } });
  if (gone) {
    throw new Error('Delete verification failed: role still exists');
  }

  console.log('\n✓ Database persistence verified: read, write, and delete work.');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
