/**
 * cache.ts
 * Cache genérico con TTL sobre LocalStorage.
 * RNF-PERF-01: Catálogo con TTL 30 min | RNF-PERF-02: Inventario con TTL 5 min.
 *
 * Cualquier módulo puede crear su propia instancia con su clave y TTL:
 * @example
 * export const plansCache = createCache<Plan[]>('plans_cache', 30 * 60 * 1000);
 */

interface CacheEntry<T> {
  data:      T;
  expiresAt: number;
}

export interface Cache<T> {
  get():            T | null;
  set(data: T):     void;
  invalidate():     void;
  isValid():        boolean;
}

/**
 * Crea una instancia de cache tipada para una clave de LocalStorage.
 * @param key    - Clave en LocalStorage
 * @param ttlMs  - Tiempo de vida en milisegundos
 */
export function createCache<T>(key: string, ttlMs: number): Cache<T> {
  return {
    get(): T | null {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() > entry.expiresAt) {
          localStorage.removeItem(key);
          return null;
        }
        return entry.data;
      } catch {
        return null;
      }
    },

    set(data: T): void {
      try {
        const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // LocalStorage lleno — ignorar silenciosamente
      }
    },

    invalidate(): void {
      localStorage.removeItem(key);
    },

    isValid(): boolean {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const entry: CacheEntry<T> = JSON.parse(raw);
        return Date.now() <= entry.expiresAt;
      } catch {
        return false;
      }
    },
  };
}
