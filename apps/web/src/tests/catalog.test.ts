/**
 * catalog.test.ts
 * Tests del CRUD de catálogo (planes y productos).
 * RNF-TEST-01: Mínimo 1 test por RF implementado.
 *
 * Ubicación: src/tests/catalog.test.ts
 * Ejecutar:  npx vitest run src/tests/catalog.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Plan, Product, CreatePlanDto, CreateProductDto } from '../types/catalog';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockFetch = vi.fn() as unknown as ReturnType<typeof vi.fn> & typeof fetch;
globalThis.fetch = mockFetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => 'test-uuid' } });

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan_home_200', name: 'Internet Hogar 200Mbps',
    type: 'HOME_INTERNET', price: 1850, currency: 'DOP', isActive: true,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod_router_ax', name: 'Router WiFi 6 AX',
    category: 'ROUTER', isSerialized: true,
    ...overrides,
  };
}

function mockOk<T>(data: T) {
  (mockFetch as any).mockResolvedValueOnce({ ok: true, json: async () => data } as Response);
}

function mockFail(status: number, detail: string) {
  (mockFetch as any).mockResolvedValueOnce({
    ok: false, status, url: '/api',
    json: async () => ({ detail, status, type: '', title: detail, instance: '', correlationId: '' }),
  } as Response);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Catálogo CRUD', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetch.mockReset();
    localStorageMock.setItem('access_token', 'test-token');
  });

  // ── catalogService — Plans ─────────────────────────────────────────────────
  describe('catalogService: Planes', () => {
    it('CRUD-01: getPlans retorna lista de planes sanitizada', async () => {
      const { getPlans } = await import('../services/catalogService');
      mockOk([makePlan({ name: '<b>Plan</b>' })]);

      const result = await getPlans();
      expect(result[0].name).not.toContain('<b>');
      expect(result[0].name).toContain('&lt;b&gt;');
    });

    it('CRUD-02: createPlan llama POST /api/v1/plans con el DTO correcto', async () => {
      const { createPlan } = await import('../services/catalogService');
      const dto: CreatePlanDto = { name: 'Nuevo Plan', type: 'MOBILE_DATA', price: 999, currency: 'DOP', isActive: true };
      mockOk({ ...dto, id: 'plan_new' });

      const result = await createPlan(dto);
      expect(result.id).toBe('plan_new');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/plans'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('CRUD-03: updatePlan llama PATCH /api/v1/plans/:id', async () => {
      const { updatePlan } = await import('../services/catalogService');
      mockOk(makePlan({ name: 'Plan Editado' }));

      const result = await updatePlan('plan_home_200', { name: 'Plan Editado' });
      expect(result.name).toBe('Plan Editado');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/plans/plan_home_200'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('CRUD-04: deletePlan llama DELETE /api/v1/plans/:id', async () => {
      const { deletePlan } = await import('../services/catalogService');
      mockOk(null);

      await deletePlan('plan_home_200');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/plans/plan_home_200'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('CRUD-05: createPlan lanza error si la API falla', async () => {
      const { createPlan } = await import('../services/catalogService');
      mockFail(400, 'Nombre ya existe.');

      await expect(createPlan({ name: 'Dup', type: 'VOICE', price: 100, currency: 'DOP', isActive: true }))
        .rejects.toThrow('Nombre ya existe.');
    });
  });

  // ── catalogService — Products ──────────────────────────────────────────────
  describe('catalogService: Productos', () => {
    it('CRUD-06: getProducts retorna lista de productos sanitizada', async () => {
      const { getProducts } = await import('../services/catalogService');
      mockOk([makeProduct({ name: '<script>xss</script>' })]);

      const result = await getProducts();
      expect(result[0].name).not.toContain('<script>');
    });

    it('CRUD-07: createProduct llama POST /api/v1/products', async () => {
      const { createProduct } = await import('../services/catalogService');
      const dto: CreateProductDto = { name: 'ONT Nueva', category: 'ONT', isSerialized: true };
      mockOk({ ...dto, id: 'prod_new' });

      const result = await createProduct(dto);
      expect(result.id).toBe('prod_new');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/products'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('CRUD-08: updateProduct llama PATCH /api/v1/products/:id', async () => {
      const { updateProduct } = await import('../services/catalogService');
      mockOk(makeProduct({ name: 'Router Editado' }));

      const result = await updateProduct('prod_router_ax', { name: 'Router Editado' });
      expect(result.name).toBe('Router Editado');
    });

    it('CRUD-09: deleteProduct llama DELETE /api/v1/products/:id', async () => {
      const { deleteProduct } = await import('../services/catalogService');
      mockOk(null);

      await deleteProduct('prod_router_ax');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/prod_router_ax'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ── useCatalog hook ────────────────────────────────────────────────────────
  describe('useCatalog hook', () => {
    it('CRUD-10: carga planes y productos al montar', async () => {
      const { useCatalog } = await import('../components/useCatalog');
      mockOk([makePlan()]);
      mockOk([makeProduct()]);

      const { result } = renderHook(() => useCatalog());

      await waitFor(() => {
        expect(result.current.plans.loading).toBe(false);
        expect(result.current.products.loading).toBe(false);
      });

      expect(result.current.plans.items).toHaveLength(1);
      expect(result.current.products.items).toHaveLength(1);
    });

    it('CRUD-11: addPlan agrega el nuevo plan al estado', async () => {
      const { useCatalog } = await import('../components/useCatalog');
      mockOk([]);      // loadPlans  (mount)
      mockOk([]);      // loadProducts (mount)

      const { result } = renderHook(() => useCatalog());
      await waitFor(() => expect(result.current.plans.loading).toBe(false));

      mockOk(makePlan({ id: 'plan_new', name: 'Nuevo' }));

      await act(async () => {
        await result.current.addPlan({
          name: 'Nuevo', type: 'HOME_INTERNET', price: 1500, currency: 'DOP', isActive: true,
        });
      });

      expect(result.current.plans.items.some((p: Plan) => p.name === 'Nuevo')).toBe(true);
    });

    it('CRUD-12: removePlan elimina el plan del estado local', async () => {
      const { useCatalog } = await import('../components/useCatalog');
      mockOk([makePlan()]);
      mockOk([]);

      const { result } = renderHook(() => useCatalog());
      await waitFor(() => expect(result.current.plans.loading).toBe(false));

      mockOk(null);
      await act(async () => { await result.current.removePlan('plan_home_200'); });

      expect(result.current.plans.items.find((p: Plan) => p.id === 'plan_home_200')).toBeUndefined();
    });
  });
});
