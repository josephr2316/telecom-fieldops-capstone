import request from 'supertest';
import app from '../src/infra/app';
import { resetDb } from '../src/infra/db/connection';
import { userRepository } from '../src/infra/repositories/user.repo';

const VENTAS_USER_ID = 'usr-ventas-01';

const login = async (email: string, password: string) => {
  return request(app).post('/api/v1/auth/login').send({ email, password });
};

const ensureVentasUnblocked = async () => {
  await userRepository.update(VENTAS_USER_ID, { blocked: false });
};

describe('RF-13 dashboard KPI endpoint', () => {
  beforeEach(async () => {
    resetDb();
    await ensureVentasUnblocked();
  });

  it('returns dashboard payload with at least 8 KPIs', async () => {
    const auth = await login('admin@telecom.local', 'Admin123!');

    const response = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${auth.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('generatedAt');
    expect(response.body).toHaveProperty('timezone');
    expect(response.body).toHaveProperty('kpis');
    expect(response.body).toHaveProperty('cards');

    const kpiKeys = Object.keys(response.body.kpis ?? {});
    expect(kpiKeys.length).toBeGreaterThanOrEqual(8);
    expect(kpiKeys).toEqual(
      expect.arrayContaining([
        'kpi01CreatedTodayByType',
        'kpi02CompletedToday',
        'kpi03CancellationRate',
        'kpi04AvgCycleHoursByType',
        'kpi05BacklogByStatus',
        'kpi06CriticalInventoryByBranch',
        'kpi07TopReservedProducts',
        'kpi08ClaimsByFailureCategory',
      ]),
    );
  });

  it('returns 403 without kpis:read permission', async () => {
    const auth = await login('ventas@telecom.local', 'Ventas123!');

    const response = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${auth.body.accessToken}`);

    expect(response.status).toBe(403);
  });
});
