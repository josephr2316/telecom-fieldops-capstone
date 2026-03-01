import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma/prismaClient';
import type { Plan, PlanCategory, PlanCurrency, PlanStatus, PlanType } from '../../domain/models/types';

export interface CreatePlanInput {
  name: string;
  type: PlanType;
  price: number;
  currency: PlanCurrency;
  isActive?: boolean;
  description?: string;
  category?: PlanCategory;
  downloadSpeedMbps?: number | null;
  uploadSpeedMbps?: number | null;
  dataLimitGB?: number | null;
}

export interface UpdatePlanInput {
  name?: string;
  type?: PlanType;
  price?: number;
  currency?: PlanCurrency;
  isActive?: boolean;
  description?: string;
  category?: PlanCategory;
  status?: PlanStatus;
  monthlyPrice?: number;
  downloadSpeedMbps?: number | null;
  uploadSpeedMbps?: number | null;
  dataLimitGB?: number | null;
}

/** Safe date to ISO string (handles Date or string from DB). */
function toIso(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

/** Maps a Prisma Plan row to the domain Plan type (Decimal -> number, dataLimitGb -> dataLimitGB). */
function toDomainPlan(row: {
  id: string;
  name: string;
  type: string;
  price: unknown;
  currency: string;
  isActive: boolean;
  description: string;
  category: string;
  status: string;
  monthlyPrice: unknown;
  downloadSpeedMbps: number | null;
  uploadSpeedMbps: number | null;
  dataLimitGb: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): Plan {
  const priceNum =
    typeof row.price === 'object' && row.price != null && 'toNumber' in (row.price as object)
      ? (row.price as { toNumber: () => number }).toNumber()
      : Number(row.price);
  const monthlyNum =
    typeof row.monthlyPrice === 'object' && row.monthlyPrice != null && 'toNumber' in (row.monthlyPrice as object)
      ? (row.monthlyPrice as { toNumber: () => number }).toNumber()
      : Number(row.monthlyPrice);
  return {
    id: row.id,
    name: row.name,
    type: row.type as PlanType,
    price: Number.isFinite(priceNum) ? priceNum : 0,
    currency: row.currency as PlanCurrency,
    isActive: row.isActive,
    description: row.description ?? '',
    category: row.category as PlanCategory,
    status: row.status as PlanStatus,
    monthlyPrice: Number.isFinite(monthlyNum) ? monthlyNum : 0,
    downloadSpeedMbps: row.downloadSpeedMbps,
    uploadSpeedMbps: row.uploadSpeedMbps,
    dataLimitGB: row.dataLimitGb,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/**
 * Plans repository backed by Prisma (PostgreSQL).
 * All methods are async.
 */
export const plansRepository = {
  /** Returns all plans ordered by creation date. */
  async listAll(): Promise<Plan[]> {
    const rows = await prisma.plan.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toDomainPlan);
  },

  /** Finds a plan by id; returns null if not found. */
  async findById(id: string): Promise<Plan | null> {
    const row = await prisma.plan.findUnique({ where: { id } });
    return row ? toDomainPlan(row) : null;
  },

  /** Creates a new plan with a generated id. */
  async create(input: CreatePlanInput): Promise<Plan> {
    const id = `plan_${randomUUID().slice(0, 8)}`;
    const isActive = input.isActive ?? true;
    const created = await prisma.plan.create({
      data: {
        id,
        name: input.name,
        type: input.type,
        price: input.price,
        currency: input.currency,
        isActive,
        description: input.description ?? '',
        category: input.category ?? 'RESIDENCIAL',
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        monthlyPrice: input.price,
        downloadSpeedMbps: input.downloadSpeedMbps ?? null,
        uploadSpeedMbps: input.uploadSpeedMbps ?? null,
        dataLimitGb: input.dataLimitGB ?? null,
      },
    });
    return toDomainPlan(created);
  },

  /** Updates an existing plan by id; returns null if not found. */
  async update(id: string, input: UpdatePlanInput): Promise<Plan | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const data: Record<string, unknown> = {};
    if (input.name != null) data.name = input.name;
    if (input.type != null) data.type = input.type;
    if (input.price != null) data.price = input.price;
    if (input.currency != null) data.currency = input.currency;
    if (input.description != null) data.description = input.description;
    if (input.category != null) data.category = input.category;
    if (input.downloadSpeedMbps !== undefined) data.downloadSpeedMbps = input.downloadSpeedMbps;
    if (input.uploadSpeedMbps !== undefined) data.uploadSpeedMbps = input.uploadSpeedMbps;
    if (input.dataLimitGB !== undefined) data.dataLimitGb = input.dataLimitGB;
    if (typeof input.isActive === 'boolean') {
      data.isActive = input.isActive;
      data.status = input.isActive ? 'ACTIVE' : 'INACTIVE';
    } else if (input.status != null) {
      data.status = input.status;
      data.isActive = input.status === 'ACTIVE';
    }
    if (input.monthlyPrice != null) data.monthlyPrice = input.monthlyPrice;
    else if (input.price != null) data.monthlyPrice = input.price;

    const updated = await prisma.plan.update({
      where: { id },
      data: data as any,
    });
    return toDomainPlan(updated);
  },

  /** Sets plan active; returns updated plan or null if not found. */
  async activate(id: string): Promise<Plan | null> {
    return this.update(id, { isActive: true, status: 'ACTIVE' });
  },

  /** Sets plan inactive; returns updated plan or null if not found. */
  async deactivate(id: string): Promise<Plan | null> {
    return this.update(id, { isActive: false, status: 'INACTIVE' });
  },

  /** Deletes a plan by id; returns true if deleted, false if not found. */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.plan.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
