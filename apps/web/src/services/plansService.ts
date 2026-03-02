/**
 * plansService.ts
 * RF-04: Catálogo de planes — listar, activar, desactivar.
 * Usa los servicios compartidos del proyecto.
 *
 * RNF-PERF-01: Cache con TTL 30 min (vía cache.ts)
 * RNF-SEC-02:  Sanitización anti-XSS (vía sanitizer.ts)
 */

import { Plan }             from '../types/plans';
import { apiClient }        from './apiClient';
import { createCache }      from './cache';
import { sanitizeObject }   from './sanitizer';
import { PLAN_ENDPOINTS }   from './planEndpoints';

// ─── Cache de planes (RNF-PERF-01: TTL 30 min) ───────────────────────────────
const PLANS_TTL_MS = 30 * 60 * 1000;
const plansCache   = createCache<Plan[]>('plans_cache', PLANS_TTL_MS);

// ─── Sanitización ─────────────────────────────────────────────────────────────
const SANITIZE_FIELDS: (keyof Plan)[] = ['name', 'description'];

function sanitizePlan(plan: Plan): Plan {
  return sanitizeObject(plan, SANITIZE_FIELDS);
}

// ─── API calls ────────────────────────────────────────────────────────────────

export interface FetchPlansOptions {
  forceRefresh?: boolean;
}

/**
 * RF-04: Listar todos los planes.
 * EC-08: Si el cache expiró se hace refresh obligatorio.
 */
export async function fetchPlans(
  { forceRefresh = false }: FetchPlansOptions = {}
): Promise<Plan[]> {
  if (!forceRefresh) {
    const cached = plansCache.get();
    if (cached) return cached;
  }

  const data = await apiClient.get<Plan[]>(PLAN_ENDPOINTS.list);
  const sanitized = data.map(sanitizePlan);
  plansCache.set(sanitized);
  return sanitized;
}

/**
 * RF-04: Activar un plan.
 * Invalida cache para que el próximo fetch traiga datos frescos.
 */
export async function activatePlan(planId: string): Promise<Plan> {
  const data = await apiClient.patch<Plan>(PLAN_ENDPOINTS.activate(planId));
  plansCache.invalidate();
  return sanitizePlan(data);
}

/**
 * RF-04: Desactivar un plan.
 * Invalida cache para que el próximo fetch traiga datos frescos.
 */
export async function deactivatePlan(planId: string): Promise<Plan> {
  const data = await apiClient.patch<Plan>(PLAN_ENDPOINTS.deactivate(planId));
  plansCache.invalidate();
  return sanitizePlan(data);
}

/** Expone invalidación directa por si otro módulo necesita limpiar el cache. */
export function invalidatePlansCache(): void {
  plansCache.invalidate();
}
