/**
 * useCatalog.ts
 * Hook de estado para el CRUD de Planes y Productos.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plan, Product,
  CreatePlanDto, UpdatePlanDto,
  CreateProductDto, UpdateProductDto,
} from '../types/catalog';
import {
  getPlans, createPlan, updatePlan, deletePlan,
  getProducts, createProduct, updateProduct, deleteProduct,
} from '../services/catalogService';

// ─── Tipos del hook ───────────────────────────────────────────────────────────

interface CrudState<T> {
  items:     T[];
  loading:   boolean;
  error:     string | null;
  saving:    boolean;
  deletingId: string | null;
}

interface UseCatalogReturn {
  plans:         CrudState<Plan>;
  products:      CrudState<Product>;
  // Plans actions
  loadPlans:     () => Promise<void>;
  addPlan:       (dto: CreatePlanDto)          => Promise<Plan | null>;
  editPlan:      (id: string, dto: UpdatePlanDto) => Promise<Plan | null>;
  removePlan:    (id: string)                  => Promise<boolean>;
  // Products actions
  loadProducts:  () => Promise<void>;
  addProduct:    (dto: CreateProductDto)             => Promise<Product | null>;
  editProduct:   (id: string, dto: UpdateProductDto) => Promise<Product | null>;
  removeProduct: (id: string)                        => Promise<boolean>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function initialState<T>(): CrudState<T> {
  return { items: [], loading: false, error: null, saving: false, deletingId: null };
}

export function useCatalog(): UseCatalogReturn {
  const [plans,    setPlans]    = useState<CrudState<Plan>>(initialState());
  const [products, setProducts] = useState<CrudState<Product>>(initialState());

  // ── Plans ──────────────────────────────────────────────────────────────────

  const loadPlans = useCallback(async (): Promise<void> => {
    setPlans(s => ({ ...s, loading: true, error: null }));
    try {
      const items = await getPlans();
      setPlans(s => ({ ...s, items, loading: false }));
    } catch (err) {
      setPlans(s => ({
        ...s, loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar planes.',
      }));
    }
  }, []);

  const addPlan = useCallback(async (dto: CreatePlanDto): Promise<Plan | null> => {
    setPlans(s => ({ ...s, saving: true, error: null }));
    try {
      const created = await createPlan(dto);
      setPlans(s => ({ ...s, saving: false, items: [...s.items, created] }));
      return created;
    } catch (err) {
      setPlans(s => ({
        ...s, saving: false,
        error: err instanceof Error ? err.message : 'Error al crear plan.',
      }));
      return null;
    }
  }, []);

  const editPlan = useCallback(async (id: string, dto: UpdatePlanDto): Promise<Plan | null> => {
    setPlans(s => ({ ...s, saving: true, error: null }));
    try {
      const updated = await updatePlan(id, dto);
      setPlans(s => ({
        ...s, saving: false,
        items: s.items.map(p => p.id === id ? updated : p),
      }));
      return updated;
    } catch (err) {
      setPlans(s => ({
        ...s, saving: false,
        error: err instanceof Error ? err.message : 'Error al actualizar plan.',
      }));
      return null;
    }
  }, []);

  const removePlan = useCallback(async (id: string): Promise<boolean> => {
    setPlans(s => ({ ...s, deletingId: id, error: null }));
    try {
      await deletePlan(id);
      setPlans(s => ({
        ...s, deletingId: null,
        items: s.items.filter(p => p.id !== id),
      }));
      return true;
    } catch (err) {
      setPlans(s => ({
        ...s, deletingId: null,
        error: err instanceof Error ? err.message : 'Error al eliminar plan.',
      }));
      return false;
    }
  }, []);

  // ── Products ───────────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (): Promise<void> => {
    setProducts(s => ({ ...s, loading: true, error: null }));
    try {
      const items = await getProducts();
      setProducts(s => ({ ...s, items, loading: false }));
    } catch (err) {
      setProducts(s => ({
        ...s, loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar productos.',
      }));
    }
  }, []);

  const addProduct = useCallback(async (dto: CreateProductDto): Promise<Product | null> => {
    setProducts(s => ({ ...s, saving: true, error: null }));
    try {
      const created = await createProduct(dto);
      setProducts(s => ({ ...s, saving: false, items: [...s.items, created] }));
      return created;
    } catch (err) {
      setProducts(s => ({
        ...s, saving: false,
        error: err instanceof Error ? err.message : 'Error al crear producto.',
      }));
      return null;
    }
  }, []);

  const editProduct = useCallback(async (id: string, dto: UpdateProductDto): Promise<Product | null> => {
    setProducts(s => ({ ...s, saving: true, error: null }));
    try {
      const updated = await updateProduct(id, dto);
      setProducts(s => ({
        ...s, saving: false,
        items: s.items.map(p => p.id === id ? updated : p),
      }));
      return updated;
    } catch (err) {
      setProducts(s => ({
        ...s, saving: false,
        error: err instanceof Error ? err.message : 'Error al actualizar producto.',
      }));
      return null;
    }
  }, []);

  const removeProduct = useCallback(async (id: string): Promise<boolean> => {
    setProducts(s => ({ ...s, deletingId: id, error: null }));
    try {
      await deleteProduct(id);
      setProducts(s => ({
        ...s, deletingId: null,
        items: s.items.filter(p => p.id !== id),
      }));
      return true;
    } catch (err) {
      setProducts(s => ({
        ...s, deletingId: null,
        error: err instanceof Error ? err.message : 'Error al eliminar producto.',
      }));
      return false;
    }
  }, []);

  // ── Auto-load on mount ─────────────────────────────────────────────────────
  useEffect(() => { loadPlans(); },    [loadPlans]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  return {
    plans, products,
    loadPlans, addPlan, editPlan, removePlan,
    loadProducts, addProduct, editProduct, removeProduct,
  };
}
