/**
 * localStorage.ts
 * Helpers tipados para acceso seguro a LocalStorage.
 * Centraliza todas las claves del proyecto para evitar typos y colisiones.
 * ADR-0002: Offline-first con LocalStorage.
 */

// ─── Claves del proyecto ──────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN:   'access_token',
  REFRESH_TOKEN:  'refresh_token',
  PLANS_CACHE:    'plans_cache',
  OFFLINE_QUEUE:  'offline_queue',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ─── Helpers genéricos ────────────────────────────────────────────────────────

/**
 * Lee y parsea un valor JSON de LocalStorage.
 * Retorna null si no existe o si el JSON es inválido.
 */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Serializa y guarda un valor en LocalStorage.
 * No lanza si LocalStorage está lleno — falla silenciosamente.
 */
export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // LocalStorage lleno — ignorar silenciosamente
  }
}

/** Elimina una clave de LocalStorage. */
export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/** Lee un string plano (sin parsear JSON). Útil para tokens. */
export function getRawItem(key: string): string | null {
  return localStorage.getItem(key);
}

/** Guarda un string plano (sin serializar). Útil para tokens. */
export function setRawItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// ─── Helpers específicos del proyecto ────────────────────────────────────────

export const tokenStorage = {
  getAccessToken:  (): string | null  => getRawItem(STORAGE_KEYS.ACCESS_TOKEN),
  setAccessToken:  (token: string): void => setRawItem(STORAGE_KEYS.ACCESS_TOKEN, token),
  getRefreshToken: (): string | null  => getRawItem(STORAGE_KEYS.REFRESH_TOKEN),
  setRefreshToken: (token: string): void => setRawItem(STORAGE_KEYS.REFRESH_TOKEN, token),
  clearTokens:     (): void => {
    removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};
