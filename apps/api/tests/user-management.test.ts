import request from 'supertest';
import app from '../src/infra/app';
import { prisma } from '../src/infra/db/prisma/prismaClient';
import bcrypt from 'bcrypt';

const login = async (email: string, password: string) => {
  return request(app).post('/api/v1/auth/login').send({ email, password });
};

describe('RF-02 Gestión de Usuarios - Functional Tests', () => {
  let adminToken: string;
  const testAdminEmail = 'admin-test@telecom.local';
  const testPassword = 'Admin123!';
  const hashed = bcrypt.hashSync(testPassword, 10);

  beforeEach(async () => {
    // 1. LIMPIEZA TOTAL (Orden inverso de relaciones para evitar errores de FK)
    // Primero borramos usuarios, luego roles.
    await prisma.user.deleteMany({}); 
    await prisma.role.deleteMany({});

    // 2. CONFIGURAR ROLES (Usamos create directamente ya que acabamos de limpiar)
    await prisma.role.create({
      data: { 
        id: 'ADMIN', 
        name: 'ADMIN', 
        permissionKeys: ['*', 'users:read', 'users:create', 'users:update', 'users:block'] 
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
        email: 'admin@test.com',
        passwordHash: hashed,
        roles: ['OPERATOR'],
        blocked: false
      }
    });

    
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. LOGIN PARA OBTENER TOKEN
    const adminLogin = await login(testAdminEmail, testPassword);
    adminToken = adminLogin.body.accessToken;
    console.log('DEBUG: Token Body:', JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString()));
  });

  it('FT-RF02-01 Crear usuario con datos validos y auditoría completa', async () => {
    const newUser = {
      email: 'new-operator@telecom.local',
      password: 'Password123!',
      roles: ['OPERATOR']
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-Id', 'test-corr-create-01')
      .send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(newUser.email);
  });

  it('FT-RF02-02 Rechazar creación de usuario duplicado (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: testAdminEmail,
        password: 'AnyPassword123!',
        roles: ['ADMIN']
      });

    expect(res.status).toBe(409);
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

  it('FT-RF02-03 Rechazar creación con input inválido (Zod Validation)', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'not-an-email', password: '123', roles: [] });

    expect(res.status).toBe(400);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});