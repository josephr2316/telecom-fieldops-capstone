import request from 'supertest';
import app from '../../src/infra/app';

const login = async (email: string, password: string) => {
  return request(app).post('/api/v1/auth/login').send({ email, password });
};

describe('RF-12 Sync import', () => {
  it('POST /sync/import returns 200 with appliedCount and conflicts when operation references non-existent work order', async () => {
    const auth = await login('admin@telecom.local', 'Admin123!');
    expect(auth.status).toBe(200);
    expect(auth.body.accessToken).toBeDefined();

    const response = await request(app)
      .post('/api/v1/sync/import')
      .set('Authorization', `Bearer ${auth.body.accessToken}`)
      .send({
        meta: {
          exportedAt: new Date().toISOString(),
          deviceId: 'test-device',
          appVersion: '1.0',
        },
        operations: [
          {
            opId: 'op-1',
            entityType: 'workOrder',
            entityId: 'non-existent-wo-id',
            operation: 'CHANGE_STATUS',
            payload: { newStatus: 'SUBMITTED', baseVersion: 0 },
            createdAt: new Date().toISOString(),
            createdBy: 'usr-tecnico-01',
            baseVersion: 0,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('appliedCount');
    expect(response.body).toHaveProperty('conflictCount');
    expect(response.body).toHaveProperty('conflicts');
    expect(Array.isArray(response.body.conflicts)).toBe(true);
    expect(response.body.appliedCount).toBe(0);
    expect(response.body.conflictCount).toBe(1);
    expect(response.body.conflicts[0]).toMatchObject({
      opId: 'op-1',
      entityId: 'non-existent-wo-id',
    });
    expect(response.body.conflicts[0].reason).toMatch(/not found|Work order not found/i);
  });

  it('POST /sync/import returns 401 without token', async () => {
    const response = await request(app).post('/api/v1/sync/import').send({
      meta: { exportedAt: new Date().toISOString(), deviceId: 'd', appVersion: '1' },
      operations: [],
    });
    expect(response.status).toBe(401);
  });

  it('POST /sync/import returns 403 when user lacks sync:import', async () => {
    const ventas = await login('ventas@telecom.local', 'Ventas123!');
    expect(ventas.status).toBe(200);
    const response = await request(app)
      .post('/api/v1/sync/import')
      .set('Authorization', `Bearer ${ventas.body.accessToken}`)
      .send({
        meta: { exportedAt: new Date().toISOString(), deviceId: 'd', appVersion: '1' },
        operations: [],
      });
    expect(response.status).toBe(403);
  });
});
