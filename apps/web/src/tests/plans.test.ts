/**
 * plans.test.ts
 * RF-04: Tests del catálogo de planes
 * RNF-TEST-01: Mínimo 1 test por RF implementado
 *
 * Ubicación: src/tests/plans.test.ts
 * Ejecutar:  npx vitest run src/tests/plans.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Plan, ProblemDetails } from '../types/plans';

// ─── Mock global de fetch ─────────────────────────────────────────────────────
const mockFetch = vi.fn() as unknown as ReturnType<typeof vi.fn> & typeof fetch;
globalThis.fetch = mockFetch;

// ─── Mock de localStorage ─────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string): string | null => store[key] ?? null,
    setItem:    (key: string, val: string): void  => { store[key] = val; },
    removeItem: (key: string): void  => { delete store[key]; },
    clear:      (): void => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// ─── Mock de crypto.randomUUID (usado en apiClient) ──────────────────────────
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'test-correlation-id' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id:                'plan-001',
    name:              'Plan Básico Residencial',
    description:       'Conectividad de 100 Mbps sin límite de datos.',
    category:          'RESIDENCIAL',
    status:            'ACTIVE',
    monthlyPrice:      1500,
    currency:          'DOP',
    downloadSpeedMbps: 100,
    uploadSpeedMbps:   20,
    dataLimitGB:       null,
    ...overrides,
  };
}

function mockApiSuccess<T>(data: T): void {
  (mockFetch as any).mockResolvedValueOnce({
    ok:   true,
    json: async () => data,
  } as Response);
}

function mockApiError(status: number, body: Partial<ProblemDetails>): void {
  (mockFetch as any).mockResolvedValueOnce({
    ok:   false,
    status,
    url:  '/api/v1/plans',
    json: async () => body,
  } as Response);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS RF-04
// ─────────────────────────────────────────────────────────────────────────────

describe('RF-04: Catálogo de planes', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetch.mockReset();
    localStorageMock.setItem('access_token', 'test-token');
  });

  // ── plansService ──────────────────────────────────────────────────────────

  describe('plansService.fetchPlans', () => {
    it('RF-04-01: fetcha planes con token Authorization', async () => {
      const { fetchPlans } = await import('../services/plansService');
      mockApiSuccess([makePlan()]);

      const result = await fetchPlans({ forceRefresh: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/plans'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('RF-04-02 (RNF-PERF-01): usa cache TTL sin llamar a la API de nuevo', async () => {
      const { fetchPlans, invalidatePlansCache } = await import('../services/plansService');
      invalidatePlansCache();
      mockApiSuccess([makePlan()]);

      await fetchPlans({ forceRefresh: true });
      const callsBefore = mockFetch.mock.calls.length;

      await fetchPlans(); // debe usar cache
      expect(mockFetch.mock.calls.length).toBe(callsBefore);
    });

    it('RF-04-03 (RNF-SEC-02): sanitiza tags HTML peligrosos', async () => {
      const { fetchPlans, invalidatePlansCache } = await import('../services/plansService');
      invalidatePlansCache();
      mockApiSuccess([makePlan({
        name:        '<script>alert("xss")</script>',
        description: '<img src=x onerror=alert(1)>',
      })]);

      const result = await fetchPlans({ forceRefresh: true });
      expect(result[0].name).not.toContain('<script>');
      expect(result[0].name).toContain('&lt;script&gt;');
    });

    it('RF-04-04: lanza error con mensaje del servidor', async () => {
      const { fetchPlans, invalidatePlansCache } = await import('../services/plansService');
      invalidatePlansCache();
      mockApiError(403, { detail: 'Sin permisos.', status: 403 });

      await expect(fetchPlans({ forceRefresh: true })).rejects.toThrow('Sin permisos.');
    });
  });

  describe('plansService.activatePlan / deactivatePlan', () => {
    it('RF-04-05: activa un plan y llama al endpoint correcto', async () => {
      const { activatePlan } = await import('../services/plansService');
      mockApiSuccess(makePlan({ status: 'ACTIVE' }));

      const result = await activatePlan('plan-001');
      expect(result.status).toBe('ACTIVE');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/plans/plan-001/activate'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('RF-04-06: desactiva un plan y llama al endpoint correcto', async () => {
      const { deactivatePlan } = await import('../services/plansService');
      mockApiSuccess(makePlan({ status: 'INACTIVE' }));

      const result = await deactivatePlan('plan-001');
      expect(result.status).toBe('INACTIVE');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/plans/plan-001/deactivate'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('RF-04-07: invalida el cache después del toggle', async () => {
      const { activatePlan, fetchPlans, invalidatePlansCache } = await import('../services/plansService');
      invalidatePlansCache();

      mockApiSuccess([makePlan()]);
      await fetchPlans({ forceRefresh: true });

      mockApiSuccess(makePlan({ status: 'ACTIVE' }));
      await activatePlan('plan-001');

      mockApiSuccess([makePlan({ status: 'ACTIVE' })]);
      await fetchPlans(); // debe llamar a la API (cache inválido)

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ── usePlans hook ─────────────────────────────────────────────────────────

  describe('usePlans hook', () => {
    it('RF-04-08: carga planes al montar', async () => {
      const { usePlans } = await import('../components/usePlans');
      localStorageMock.removeItem('plans_cache');
      mockApiSuccess([makePlan()]);

      const { result } = renderHook(() => usePlans());
      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.plans).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('RF-04-09: expone error string si la API falla', async () => {
      const { usePlans } = await import('../components/usePlans');
      localStorageMock.removeItem('plans_cache');
      mockApiError(500, { detail: 'Error interno.' });

      const { result } = renderHook(() => usePlans());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(typeof result.current.error).toBe('string');
    });

    it('RF-04-10: toggle revierte si la API falla (optimistic rollback)', async () => {
      const { usePlans } = await import('../components/usePlans');
      localStorageMock.removeItem('plans_cache');
      const plan = makePlan({ status: 'ACTIVE' });
      mockApiSuccess([plan]);

      const { result } = renderHook(() => usePlans());
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockApiError(400, { detail: 'No se puede desactivar.' });

      await act(async () => {
        await result.current.togglePlanStatus(plan);
      });

      expect(result.current.plans[0].status).toBe('ACTIVE');
      expect(result.current.error).toBeTruthy();
    });
  });

  // ── EC-08 ─────────────────────────────────────────────────────────────────

  describe('EC-08: refresh fuerza nueva llamada a la API', () => {
    it('refresh() trae datos frescos ignorando cache', async () => {
      const { usePlans } = await import('../components/usePlans');
      localStorageMock.removeItem('plans_cache');
      mockApiSuccess([makePlan()]);

      const { result } = renderHook(() => usePlans());
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockApiSuccess([makePlan({ name: 'Plan Actualizado' })]);
      await act(async () => { result.current.refresh(); });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.plans[0].name).toBe('Plan Actualizado');
    });
  });
});
