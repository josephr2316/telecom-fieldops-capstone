import { ApiError } from '../errors/apiError';
import { prisma } from '../../infra/db/prisma/prismaClient';

export type BranchRow = {
  id: string;
  name: string;
  isMain: boolean;
};

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  isSerialized: boolean;
};

export type InventoryRow = {
  id: string;
  branchId: string;
  productId: string;
  qtyAvailable: number;
  qtyReserved: number;
  updatedAt: string;
};

export type ReservationItemInput = {
  productId: string;
  qty: number;
};

export type ReserveRequest = {
  workOrderId: string;
  branchId: string;
  items: ReservationItemInput[];
};

export type ReservationRecord = {
  workOrderId: string;
  branchId: string;
  items: ReservationItemInput[];
  reservedAt: string;
};

export class InventoryService {
  async listBranches(): Promise<BranchRow[]> {
    const rows = await prisma.branch.findMany();
    return rows.map((r) => ({ id: r.id, name: r.name, isMain: r.isMain }));
  }

  async listProducts(): Promise<ProductRow[]> {
    const rows = await prisma.product.findMany();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      isSerialized: r.isSerialized,
    }));
  }

  async listInventory(branchId: string): Promise<Array<InventoryRow & { productName: string }>> {
    const rows = await prisma.inventory.findMany({
      where: { branchId },
      include: { product: true },
    });

    return rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      productId: r.productId,
      qtyAvailable: r.qtyAvailable,
      qtyReserved: r.qtyReserved,
      updatedAt: r.updatedAt.toISOString(),
      productName: r.product.name,
    }));
  }

  async listAllInventory(): Promise<Array<InventoryRow & { productName: string }>> {
    const rows = await prisma.inventory.findMany({ include: { product: true } });
    return rows.map((r) => ({
      id: r.id,
      branchId: r.branchId,
      productId: r.productId,
      qtyAvailable: r.qtyAvailable,
      qtyReserved: r.qtyReserved,
      updatedAt: r.updatedAt.toISOString(),
      productName: r.product.name,
    }));
  }

  async reserveForRequest(input: ReserveRequest): Promise<ReservationRecord> {
    if (!input.workOrderId?.trim()) {
      throw new ApiError(400, 'Validation Error', 'workOrderId is required', 'urn:telecom:error:validation');
    }
    if (!input.branchId?.trim()) {
      throw new ApiError(400, 'Validation Error', 'branchId is required', 'urn:telecom:error:validation');
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new ApiError(400, 'Validation Error', 'At least one item is required', 'urn:telecom:error:validation');
    }
    for (const item of input.items) {
      if (!item.productId || item.qty <= 0) {
        throw new ApiError(
          400,
          'Validation Error',
          'Each item must include productId and qty > 0',
          'urn:telecom:error:validation',
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findUnique({ where: { workOrderId: input.workOrderId } });
      if (existing) {
        throw new ApiError(
          409,
          'Conflict',
          `Work order ${input.workOrderId} already has a reservation`,
          'urn:telecom:error:inventory-reservation-conflict',
        );
      }

      const missing: string[] = [];
      for (const item of input.items) {
        const stock = await tx.inventory.findUnique({
          where: { branchId_productId: { branchId: input.branchId, productId: item.productId } },
        });
        if (!stock || stock.qtyAvailable < item.qty) {
          missing.push(item.productId);
        }
      }

      if (missing.length > 0) {
        throw new ApiError(
          409,
          'Conflict',
          `Insufficient stock for products: ${missing.join(', ')} in branch ${input.branchId}`,
          'urn:telecom:error:inventory-insufficient-stock',
        );
      }

      for (const item of input.items) {
        await tx.inventory.update({
          where: { branchId_productId: { branchId: input.branchId, productId: item.productId } },
          data: {
            qtyAvailable: { decrement: item.qty },
            qtyReserved: { increment: item.qty },
          },
        });
      }

      await tx.reservation.create({
        data: {
          workOrderId: input.workOrderId,
          branchId: input.branchId,
          items: input.items as object,
        },
      });

      return {
        workOrderId: input.workOrderId,
        branchId: input.branchId,
        items: input.items,
        reservedAt: new Date().toISOString(),
      };
    });
  }

  async releaseForRequest(workOrderId: string): Promise<ReservationRecord> {
    const reservation = await prisma.reservation.findUnique({ where: { workOrderId } });
    if (!reservation) {
      throw new ApiError(
        404,
        'Not Found',
        `Reservation for ${workOrderId} was not found`,
        'urn:telecom:error:inventory-reservation-not-found',
      );
    }

    const items = (reservation.items as ReservationItemInput[]) ?? [];
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.inventory.update({
          where: { branchId_productId: { branchId: reservation.branchId, productId: item.productId } },
          data: {
            qtyAvailable: { increment: item.qty },
            qtyReserved: { decrement: item.qty },
          },
        });
      }
      await tx.reservation.delete({ where: { workOrderId } });
    });

    return {
      workOrderId: reservation.workOrderId,
      branchId: reservation.branchId,
      items,
      reservedAt: reservation.reservedAt.toISOString(),
    };
  }
}

export const inventoryService = new InventoryService();
