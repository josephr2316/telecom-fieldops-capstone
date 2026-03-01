/**
 * Verifica conexión a la DB y prueba el login.
 * Ejecutar desde apps/api: node scripts/check-db-and-login.js
 */
require('dotenv/config');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en .env');
  process.exit(1);
}
console.log('DATABASE_URL definida: OK');

async function main() {
  let prisma;
  try {
    prisma = require('../dist/infra/db/prisma/prismaClient').prisma;
  } catch (e) {
    console.error('Error cargando Prisma client:', e.message);
    console.error('Ejecuta antes: npm run build');
    process.exit(1);
  }

  try {
    const userCount = await prisma.user.count();
    console.log('Conexión OK. Usuarios en DB:', userCount);

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@telecom.local' },
    });
    if (!admin) {
      console.log('No existe usuario admin@telecom.local. Ejecuta: npx prisma db seed');
      await prisma.$disconnect();
      return;
    }
    console.log('Usuario admin encontrado, id:', admin.id, 'roles:', admin.roles);

    const roleCount = await prisma.role.count();
    console.log('Roles en DB:', roleCount);
  } catch (e) {
    console.error('Error al consultar DB:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('--- Probando login vía HTTP ---');
  const http = require('http');
  const body = JSON.stringify({
    email: 'admin@telecom.local',
    password: 'Admin123!',
  });
  const req = http.request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('Login OK. accessToken presente:', !!json.accessToken);
          } else {
            console.log('Respuesta:', json.detail || json.title || data);
            if (json.errorName) console.log('errorName:', json.errorName);
          }
        } catch {
          console.log('Body:', data.slice(0, 300));
        }
      });
    }
  );
  req.on('error', (e) => {
    console.error('Error de conexión a la API (¿está corriendo en puerto 3000?):', e.message);
  });
  req.write(body);
  req.end();
}

main();
