import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../../src/infra/app';
import { prisma } from '../../src/infra/db/prisma/prismaClient';
import bcrypt from 'bcryptjs';

const login = async (email: string, password: string) => {
  return request(app).post('/api/v1/auth/login').send({ email, password });
};

describe('RF-02 Gestión de Usuarios - Functional Tests', () => {
  let adminToken: string;
  let operatorToken: string;
  const testAdminEmail = 'admin-test@telecom.local';
  const testOperatorEmail = 'operator-test@telecom.local';
  const testPassword = 'Admin123!';
  const hashed = bcrypt.hashSync(testPassword, 10);

  beforeEach(async () => {
    // 1. LIMPIEZA TOTAL 
    await prisma.user.deleteMany({}); 
    await prisma.role.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // 2. CONFIGURAR ROLES 
    await prisma.role.create({
      data: { 
        id: 'ADMIN', 
        name: 'ADMIN', 
        permissionKeys: ['*'] 
      }
    });

    await prisma.role.create({
      data: { 
        id: 'OPERATOR', 
        name: 'OPERATOR', 
        permissionKeys: ["users:read"] 
      }
    });

    // 3. CREAR ADMINISTRADOR PARA EL TEST
    await prisma.user.create({
      data: {
        id: 'usr-admin-test-01',
        email: testAdminEmail,
        passwordHash: hashed,
        roles: ['ADMIN'],
        blocked: false
      }
    });

    // 4. CREAR USUARIO OBJETIVO PARA EDICIÓN (FT-RF02-04)
    await prisma.user.create({
      data: { 
        id: 'usr-target-edit-01', 
        email: testOperatorEmail,
        passwordHash: hashed,
        roles: ['OPERATOR'],
        blocked: false
      }
    });

    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. LOGIN PARA OBTENER TOKEN
    const adminLogin = await login(testAdminEmail, testPassword);
    adminToken = adminLogin.body.accessToken;

    const opLogin = await login(testOperatorEmail, testPassword);
    operatorToken = opLogin.body.accessToken;
  });

  it('FT-RF02-01 Crear usuario con datos validos', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-Id', 'test-corr-create-01')
      .send({ email: 'new-operator@telecom.local', password: 'Password123!', roles: ['OPERATOR'] })
      expect(res.status).toBe(201);
        expect(res.body.email).toBe('new-operator@telecom.local');
  });

  it('FT-RF02-02 Rechazar creación de usuario duplicado', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: testAdminEmail, password: testPassword, roles: ['ADMIN'] });

    expect(res.status).toBe(409);
  });

  it('FT-RF02-05 Rechazar edicion de usuario inexistente', async () => {
    const res = await request(app)
      .patch('/api/v1/users/usr-invalid-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roles: ['OPERATOR'] });

    expect(res.status).toBe(404);
  });

  it('FT-RF02-04 Editar usuario existente y verificar before/after', async () => {
    const targetUserId = 'usr-target-edit-01'; 

    const res = await request(app)
      .patch(`/api/v1/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-Id', 'test-corr-update-01')
      .send({ roles: ['ADMIN'], blocked: true });

    expect(res.status).toBe(200);
    expect(res.body.roles).toContain('ADMIN');
    expect(res.body.blocked).toBe(true);
  });

  it('FT-RF02-03 Rechazar creación con input inválido', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'not-an-email', password: '123', roles: [] });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toHaveProperty('email');
    expect(res.body.errors).toHaveProperty('password');
  });

  it('FT-RF02-06 Bloquear usuario activo', async () => {
    const res = await request(app)
      .patch('/api/v1/users/usr-target-edit-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocked: true });

    expect(res.status).toBe(200);
    expect(res.body.blocked).toBe(true);
  });

  it('FT-RF02-07 Usuario bloqueado no puede operar', async () => {
    // 1. Bloqueamos al operador
    await prisma.user.update({
      where: { id: 'usr-target-edit-01' },
      data: { blocked: true }
    });

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${operatorToken}`);
    
      expect([401, 403]).toContain(res.status);
  });


  it('FT-RF02-08 Rechazar bloqueo de usuario inexistente', async () => {
  const res = await request(app)
    .patch('/api/v1/users/usr-non-existent-999')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ blocked: true });

  expect(res.status).toBe(404);
  expect(res.body).toMatchObject({
    status: 404,
    title: expect.any(String),
    correlationId: expect.any(String)
  });
});

  it('FT-RF02-09 RBAC - Operador no tiene permisos de creación', async () => {
    expect(operatorToken).toBeDefined();
    
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ email: 'hacker@test.com', password: testPassword, roles: ['ADMIN'] });

    expect(res.status).toBe(403);
  });

  it('FT-RF02-10 Trazabilidad completa (Auditoría)', async () => {
    const correlationId = 'audit-test-123';
    const targetId = 'usr-target-edit-01';
    
    await request(app)
      .patch('/api/v1/users/usr-target-edit-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-Id', correlationId)
      .send({ roles: ['ADMIN']});

    await new Promise(r => setTimeout(r, 1000));

    const log = await prisma.audit.findFirst({ where: { correlationId: correlationId } });

    console.log('Debugging', log);

    expect(log).not.toBeNull();
    expect(log?.entityType).toBe('user'); 
    expect(log?.entityId).toBe(targetId);
    expect(log?.action).toContain('ROLEASSIGNED');

    const before = typeof log?.before === 'string' ? JSON.parse(log.before) : log?.before;
    const after = typeof log?.after === 'string' ? JSON.parse(log.after) : log?.after;

    expect(after.roles).toContain('ADMIN');
    expect(before.roles).toContain('OPERATOR');
  });
});

afterAll(async () => {
  // Restore seed users and roles so the DB is usable after tests (e.g. frontend login).
  const seedPath = path.resolve(process.cwd(), '../../scripts/seed-data.json');
  if (fs.existsSync(seedPath)) {
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as {
      authRoles?: Array<{ id: string; name: string; permissionKeys: string[] }>;
      authUsers?: Array<{ id: string; email: string; passwordHash: string; blocked: boolean; roles: string[] }>;
    };
    const roles = data.authRoles ?? [];
    for (const r of roles) {
      await prisma.role.upsert({
        where: { id: r.id },
        create: { id: r.id, name: r.name, permissionKeys: r.permissionKeys ?? [] },
        update: { name: r.name, permissionKeys: r.permissionKeys ?? [] },
      });
    }
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
  }
  await prisma.$disconnect();
});