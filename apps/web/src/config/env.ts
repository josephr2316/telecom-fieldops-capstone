/**
 * Configuración de entorno del frontend.
 * Vite solo expone variables que empiezan por VITE_.
 */

const raw = import.meta.env.VITE_API_URL;
/** URL base de la API (sin barra final). Por defecto: localhost:3000. */
export const API_BASE_URL: string =
  (typeof raw === 'string' && raw.trim() ? raw.trim() : 'http://localhost:3000').replace(/\/$/, '');
