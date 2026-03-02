/**
 * RF-04: Tipos compartidos del catálogo de planes.
 */

export type PlanStatus = 'ACTIVE' | 'INACTIVE';

export type PlanCategory = 'RESIDENCIAL' | 'MOVIL' | 'EMPRESARIAL' | 'TV';

export interface Plan {
  id: string;
  name: string;
  description: string;
  category: PlanCategory;
  status: PlanStatus;
  monthlyPrice: number;
  currency: string;
  downloadSpeedMbps: number | null;
  uploadSpeedMbps: number | null;
  dataLimitGB: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Contrato de error (ADR-0003) */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId: string;
  errors?: Record<string, string>;
}

/** Error enriquecido lanzado por handleResponse */
export class ApiError extends Error {
  status: number;
  body: ProblemDetails;

  constructor(message: string, status: number, body: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface FetchPlansOptions {
  forceRefresh?: boolean;
}

/** Entrada del cache en LocalStorage */
export interface PlansCacheEntry {
  data: Plan[];
  expiresAt: number;
}
