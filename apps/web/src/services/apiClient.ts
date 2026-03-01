/**
 * apiClient.ts
 * Cliente HTTP base del proyecto.
 * Adjunta el token Bearer automáticamente y lanza ApiError en respuestas no-ok.
 * RNF-OBS-01: Incluye correlationId en cada request.
 */

import { ApiError, ProblemDetails } from '../types/plans';
import { API_BASE_URL } from '../config/env';

const BASE_URL = API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  const correlationId = crypto.randomUUID();

  return {
    'Content-Type': 'application/json',
    'X-Correlation-Id': correlationId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response, requestUrl: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;

  const body: ProblemDetails = await res.json().catch(() => ({
    type:          'about:blank',
    title:         'Error inesperado',
    status:        res.status,
    detail:        'No se pudo procesar la respuesta del servidor.',
    instance:      res.url,
    correlationId: '',
  }));

  // 401 con token en localStorage: sesión expirada o inválida; limpiar y redirigir a login
  if (res.status === 401 && typeof window !== 'undefined' && localStorage.getItem('access_token')) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    if (!requestUrl.includes('/auth/login')) {
      window.location.href = '/?session=expired';
    }
  }

  throw new ApiError(body.detail || body.title, res.status, body);
}

// ─── Métodos públicos ─────────────────────────────────────────────────────────

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(res, path);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return handleResponse<T>(res, path);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'POST',
      headers: getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return handleResponse<T>(res, path);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return handleResponse<T>(res, path);
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(res, path);
  },
};
