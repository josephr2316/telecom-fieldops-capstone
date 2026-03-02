import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma/prismaClient';
import type { Product, ProductCategory } from '../../domain/models/types';

export interface CreateProductInput {
  name: string;
  category: ProductCategory;
  isSerialized: boolean;
}

export interface UpdateProductInput {
  name?: string;
  category?: ProductCategory;
  isSerialized?: boolean;
}

/** Maps a Prisma Product row to the domain Product type. */
function toDomainProduct(row: { id: string; name: string; category: string; isSerialized: boolean }): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ProductCategory,
    isSerialized: row.isSerialized,
  };
}

/**
 * Products repository backed by Prisma (PostgreSQL).
 * All methods are async.
 */
export const productsRepository = {
  /** Returns all products. */
  async listAll(): Promise<Product[]> {
    const rows = await prisma.product.findMany();
    return rows.map(toDomainProduct);
  },

  /** Finds a product by id; returns null if not found. */
  async findById(id: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({ where: { id } });
    return row ? toDomainProduct(row) : null;
  },

  /** Creates a new product with a generated id. */
  async create(input: CreateProductInput): Promise<Product> {
    const id = `prod_${randomUUID().slice(0, 8)}`;
    const created = await prisma.product.create({
      data: {
        id,
        name: input.name,
        category: input.category,
        isSerialized: input.isSerialized,
      },
    });
    return toDomainProduct(created);
  },

  /** Updates an existing product by id; returns null if not found. */
  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    try {
      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...(input.name != null && { name: input.name }),
          ...(input.category != null && { category: input.category }),
          ...(input.isSerialized != null && { isSerialized: input.isSerialized }),
        },
      });
      return toDomainProduct(updated);
    } catch {
      return null;
    }
  },

  /** Deletes a product by id; returns true if deleted, false if not found. */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.product.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
