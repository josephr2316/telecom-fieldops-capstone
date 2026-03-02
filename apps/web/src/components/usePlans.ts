/**
 * usePlans.ts
 * RF-04: Hook de catálogo de planes.
 * Ubicación en proyecto: src/app/components/usePlans.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { Plan }           from '../types/plans';
import { fetchPlans, activatePlan, deactivatePlan } from '../services/plansService';

interface UsePlansReturn {
  plans:            Plan[];
  loading:          boolean;
  error:            string | null;
  togglingId:       string | null;
  togglePlanStatus: (plan: Plan) => Promise<void>;
  refresh:          () => void;
}

interface LoadOptions {
  forceRefresh?: boolean;
}

export function usePlans(): UsePlansReturn {
  const [plans,      setPlans]      = useState<Plan[]>([]);
  const [loading,    setLoading]    = useState<boolean>(true);
  const [error,      setError]      = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadPlans = useCallback(async (
    { forceRefresh = false }: LoadOptions = {}
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlans({ forceRefresh });
      setPlans(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el catálogo de planes.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const togglePlanStatus = useCallback(async (plan: Plan): Promise<void> => {
    setTogglingId(plan.id);
    const isActive = plan.status === 'ACTIVE';

    // Optimistic update
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id ? { ...p, status: isActive ? 'INACTIVE' : 'ACTIVE' } : p
      )
    );

    try {
      const updated = isActive
        ? await deactivatePlan(plan.id)
        : await activatePlan(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      // Revertir
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, status: plan.status } : p))
      );
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cambiar el estado del plan.'
      );
    } finally {
      setTogglingId(null);
    }
  }, []);

  const refresh = useCallback((): void => {
    loadPlans({ forceRefresh: true });
  }, [loadPlans]);

  return { plans, loading, error, togglingId, togglePlanStatus, refresh };
}
