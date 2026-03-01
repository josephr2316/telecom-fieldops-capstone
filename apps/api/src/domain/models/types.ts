import type { JwtPayload } from 'jsonwebtoken';

export const AUDIT_ACTIONS = {
  USER_LOGIN: 'AUD-01 USERLOGIN',
  USER_LOGOUT: 'AUD-02 USERLOGOUT',
  USER_BLOCKED: 'AUD-03 USERBLOCKED',
  ROLE_ASSIGNED: 'AUD-04 ROLEASSIGNED',
  WORKORDER_CREATED: 'AUD-05 WORKORDER_CREATED',
  WORKORDER_STATUS: 'AUD-06 WORKORDER_STATUS',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface Role {
  id: string;
  name: string;
  permissionKeys: string[];
}

export type PlanType = 'HOME_INTERNET' | 'MOBILE_DATA' | 'VOICE' | 'TV' | 'BUSINESS';
export type PlanCurrency = 'DOP' | 'USD';
export type PlanCategory = 'RESIDENCIAL' | 'MOVIL' | 'EMPRESARIAL' | 'TV';
export type PlanStatus = 'ACTIVE' | 'INACTIVE';

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  currency: PlanCurrency;
  isActive: boolean;
  description: string;
  category: PlanCategory;
  status: PlanStatus;
  monthlyPrice: number;
  downloadSpeedMbps: number | null;
  uploadSpeedMbps: number | null;
  dataLimitGB: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory =
  | 'ROUTER'
  | 'MODEM'
  | 'ONT'
  | 'STB'
  | 'ANTENNA'
  | 'CABLE'
  | 'PHONE'
  | 'TABLET'
  | 'LAPTOP'
  | 'SIM';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  isSerialized: boolean;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  blocked: boolean;
  roles: string[];
}

export interface UserPublic {
  id: string;
  email: string;
  blocked: boolean;
  roles: string[];
}

export interface RefreshTokenRecord {
  jti: string;
  userId: string;
  exp: number;
  revokedAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorUserId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId: string;
  errors?: Record<string, string[]>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  blocked: boolean;
  tokenJti: string;
}

export interface AccessTokenClaims extends JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  blocked: boolean;
  jti: string;
  type: 'access';
}

export interface RefreshTokenClaims extends JwtPayload {
  userId: string;
  jti: string;
  type: 'refresh';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
  user: UserPublic & {
    permissions: string[];
  };
}

export interface LoggerContext {
  correlationId: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

// --- Work order domain types ------------------------------------------------

export type WorkOrderType =
  | 'NEW_SERVICE_INSTALL'
  | 'CLAIM_TROUBLESHOOT'
  | 'PLAN_AND_EQUIPMENT_SALE'
  | 'EQUIPMENT_ONLY_SALE'
  | 'MONTHLY_PAYMENT'
  | 'SERVICE_UPGRADE'
  | 'SERVICE_DOWN_OUTAGE';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ELIGIBILITY_CHECK'
  | 'INVENTORY_RESERVATION'
  | 'ON_HOLD'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'VERIFICATION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'IN_REVIEW'
  | 'TECH_ASSIGNMENT'
  | 'PRODUCT_SELECTION'
  | 'PAYMENT_CONFIRMATION'
  | 'FULFILLMENT'
  | 'DELIVERY'
  | 'PAYMENT_VALIDATION'
  | 'RECEIPT_ISSUED'
  | 'PLAN_CHANGE'
  | 'TRIAGE'
  | 'FIELD_DISPATCH'
  | 'CONFLICT'
  | 'CANCELLED';

export interface WorkOrderItem {
  productId: string;
  qty: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface WorkOrder {
  id: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  customerId: string;
  createdByUserId?: string;
  branchId?: string;
  planId?: string;
  assignedTechUserId?: string;
  version: number;
  items?: WorkOrderItem[];
  technicianNotes?: string | null;
  checklist?: ChecklistItem[] | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      user?: AuthenticatedUser;
    }
  }
}
