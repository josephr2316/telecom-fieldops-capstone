
export type PlanType =
  | 'HOME_INTERNET'
  | 'MOBILE_DATA'
  | 'VOICE'
  | 'TV'
  | 'BUSINESS';

export type Currency = 'DOP' | 'USD';

export interface Plan {
  id:       string;
  name:     string;
  type:     PlanType;
  price:    number;
  currency: Currency;
  isActive: boolean;
}

export type CreatePlanDto = Omit<Plan, 'id'>;
export type UpdatePlanDto = Partial<CreatePlanDto>;

// ─── Productos ────────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'ROUTER'
  | 'MODEM'
  | 'ONT'
  | 'STB'
  | 'CABLE'
  | 'SIM'
  | 'ANTENNA';

export interface Product {
  id:           string;
  name:         string;
  category:     ProductCategory;
  isSerialized: boolean;
}

export type CreateProductDto = Omit<Product, 'id'>;
export type UpdateProductDto = Partial<CreateProductDto>;

// ─── Labels UI ────────────────────────────────────────────────────────────────

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  HOME_INTERNET: 'Internet Hogar',
  MOBILE_DATA:   'Datos Móvil',
  VOICE:         'Voz / Minutos',
  TV:            'TV',
  BUSINESS:      'Empresarial',
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  ROUTER:  'Router',
  MODEM:   'Modem',
  ONT:     'ONT Fibra',
  STB:     'Decodificador',
  CABLE:   'Cableado',
  SIM:     'SIM',
  ANTENNA: 'Antena',
};
