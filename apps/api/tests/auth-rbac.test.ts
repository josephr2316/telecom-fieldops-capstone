import request from 'supertest';
import app from '../src/infra/app';
import { resetDb } from '../src/infra/db/connection';
import { userRepository } from '../src/infra/repositories/user.repo';
import { auditService } from '../src/domain/services/audit.service';
import type { AuditEvent } from '../src/domain/models/types';

const VENTAS_USER_ID = 'usr-ventas-01';

const login = async (email: string, password: string) => {
  return request(app).post('/api/v1/auth/login').send({ email, password });
};

/** Asegura que el usuario ventas esté desbloqueado (los tests usan Prisma/DB real). */
const ensureVentasUnblocked = async () => {
  await userRepository.update(VENTAS_USER_ID, { blocked: false });
};

describe('Auth and RBAC integration', () => {
  beforeEach(async () => {
    resetDb();
    await ensureVentasUnblocked();
  });

  it('RF-01 login returns 200 with access and refresh tokens', async () => {
    const response = await login('admin@telecom.local', 'Admin123!');

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.expiresIn).toBe(3600);
    expect(response.body.refreshExpiresIn).toBe(604800);
  });

  it('RF-01 login returns 401 for invalid credentials', async () => {
    const response = await login('admin@telecom.local', 'WrongPassword!');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      title: 'Unauthorized',
      status: 401,
    });
  });

  it('RF-03 returns 403 when user lacks permission', async () => {
    const ventasLogin = await login('ventas@telecom.local', 'Ventas123!');
    expect(ventasLogin.status).toBe(200);
    expect(ventasLogin.body.accessToken).toBeDefined();

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${ventasLogin.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      title: 'Forbidden',
      status: 403,
    });
  });

  it('GET /audit returns 403 when user lacks audit:read', async () => {
    const ventasLogin = await login('ventas@telecom.local', 'Ventas123!');
    expect(ventasLogin.status).toBe(200);
    expect(ventasLogin.body.accessToken).toBeDefined();

    const response = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${ventasLogin.body.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('POST /users/:id/block with wrong id (user-ventas-01) returns 404', async () => {
    const adminLogin = await login('admin@telecom.local', 'Admin123!');

    const res = await request(app)
      .post('/api/v1/users/user-ventas-01/block')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.detail).toMatch(/not found|User not found/i);
  });

  it('RF-02 blocked user receives 403 on protected endpoint with old token', async () => {
    const ventasLogin = await login('ventas@telecom.local', 'Ventas123!');
    expect(ventasLogin.status).toBe(200);
    expect(ventasLogin.body.accessToken).toBeDefined();
    const adminLogin = await login('admin@telecom.local', 'Admin123!');

    const blockResponse = await request(app)
      .post('/api/v1/users/usr-ventas-01/block')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send();

    expect(blockResponse.status).toBe(200);

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${ventasLogin.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.type).toBe('urn:telecom:error:user-blocked');
  });

  it('Audit event is created for login (AUD-01 USERLOGIN)', async () => {
    await login('admin@telecom.local', 'Admin123!');

    const { items: audits } = await auditService.list();
    const hasLoginAudit = audits.some((entry: AuditEvent) => entry.action === 'AUD-01 USERLOGIN');

    expect(hasLoginAudit).toBe(true);
  });

  it('RF-14 GET /audit returns 200 with admin token and list shape', async () => {
    const adminLogin = await login('admin@telecom.local', 'Admin123!');

    const response = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
    });
  });
});
