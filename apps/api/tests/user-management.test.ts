import request from 'supertest';
import app from '../src/infra/app';
import { resetDb } from '../src/infra/db/connection';
import { auditService } from '../src/domain/services/audit.service';
import { prisma } from '../src/infra/db/prisma/prismaClient';
import { beforeEach, it } from 'node:test';

const login = async (email: string, password: string) => {
  return request(app).post('/api/v1/auth/login').send({ email, password });
};

describe('RF-02 Gestión de Usuarios - Functional Tests', () => {
  let adminToken: string;

  beforeEach(async () => {
    await resetDb();
    const adminLogin = await login('admin@telecom.local', 'Admin123!');
    adminToken = adminLogin.body.accessToken;
  });

  it('FT-RF02-01 Crear usuario con datos validos y auditoría completa', async () => {
    const correlationId = 'test-corr-create-01';
    const newUser = {
      email: 'new-operator@telecom.local',
      password: 'Password123!',
      roles: ['OPERATOR']
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-Id', correlationId)
      .send(newUser);

    // 1. Validar Respuesta
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(newUser.email);
    expect(res.body.id).toBeDefined();

    // 2. Validar Persistencia
    const userInDb = await prisma.user.findUnique({ where: { email: newUser.email } });
    expect(userInDb).toBeTruthy();

    // 3. Validar Auditoría (AUD-07 USERCREATED)
    const { items: audits } = await auditService.list();
    const creationAudit = audits.find(a => a.correlationId === correlationId);
    
    expect(creationAudit).toMatchObject({
      action: 'AUD-07 USERCREATED',
      entityType: 'User',
      entityId: res.body.id,
      before: null,
    });
    expect(creationAudit?.after).toHaveProperty('email', newUser.email);
  });

  it('FT-RF02-02 Rechazar creación de usuario duplicado (409 Conflict)', async () => {
    const duplicateUser = {
      email: 'admin@telecom.local', // Ya existe por el seed
      password: 'AnyPassword123!',
      roles: ['ADMIN']
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(duplicateUser);

    expect(res.status).toBe(409);
    expect(res.body.type).toContain('conflict'); // O el URN que definas
  });

  it('FT-RF02-04 Editar usuario existente y verificar before/after', async () => {
    const correlationId = 'test-corr-update-01';
    // ID del usuario ventas que viene en tu seed
    const targetUserId = 'usr-ventas-01'; 

    const updateData = {
      roles: ['TECHNICIAN'],
      blocked: true
    };

    const res = await request(app)
      .patch(`/api/v1/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-Id', correlationId)
      .send(updateData);

    expect(res.status).toBe(200);

    // Validar que la auditoría guardó el estado anterior
    const { items: audits } = await auditService.list();
    const updateAudit = audits.find(a => a.correlationId === correlationId);

    expect(updateAudit?.before).toHaveProperty('roles');
    expect(updateAudit?.after).toHaveProperty('roles', ['TECHNICIAN']);
  });

  it('FT-RF02-03 Rechazar creación con input inválido (Zod Validation)', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'not-an-email',
        password: '123', // Demasiado corta
        roles: [] // Mínimo 1 según tu schema Zod
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('email');
    expect(res.body.errors).toHaveProperty('password');
    expect(res.body.errors).toHaveProperty('roles');
  });
});