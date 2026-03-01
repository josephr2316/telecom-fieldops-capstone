import { ApiError } from '../errors/apiError';
import type { Product } from '../models/types';
import {
  productsRepository,
  type CreateProductInput,
  type UpdateProductInput,
} from '../../infra/repositories/products.repo';

const notFoundError = (id: string) =>
  new ApiError(404, 'Not Found', `No existe producto con id ${id}`, 'urn:telecom:error:product-not-found');

/** Products service: list, get by id, create, update, delete. All methods async. */
export const productsService = {
  async listProducts(): Promise<Product[]> {
    return productsRepository.listAll();
  },

  async getProductById(id: string): Promise<Product> {
    const product = await productsRepository.findById(id);
    if (!product) throw notFoundError(id);
    return product;
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    return productsRepository.create(input);
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const updated = await productsRepository.update(id, input);
    if (!updated) throw notFoundError(id);
    return updated;
  },

  async deleteProduct(id: string): Promise<void> {
    const deleted = await productsRepository.delete(id);
    if (!deleted) throw notFoundError(id);
  },
};
