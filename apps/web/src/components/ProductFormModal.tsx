import React, { useEffect, useState } from "react";
import { Product, CreateProductDto, ProductCategory, PRODUCT_CATEGORY_LABELS } from "../types/catalog";

interface ProductFormModalProps {
  open: boolean;
  product?: Product | null;
  saving: boolean;
  onSave: (dto: CreateProductDto) => void;
  onClose: () => void;
}

const EMPTY_FORM: CreateProductDto = {
  name: "",
  category: "ROUTER",
  isSerialized: true,
};

const CATEGORIES: ProductCategory[] = ["ROUTER", "MODEM", "ONT", "STB", "CABLE", "SIM", "ANTENNA"];

export function ProductFormModal({ open, product, saving, onSave, onClose }: ProductFormModalProps) {
  const [form, setForm] = useState<CreateProductDto>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateProductDto, string>>>({});

  const isEditing = Boolean(product);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              category: product.category,
              isSerialized: product.isSerialized,
            }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [open, product]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "El nombre es requerido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSave(form);
  }

  function field<K extends keyof CreateProductDto>(key: K, value: CreateProductDto[K]) {
    setForm((f: CreateProductDto) => ({ ...f, [key]: value }));
    setErrors((e: Record<string, string | undefined>) => ({ ...e, [key]: undefined }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{isEditing ? "Editar producto" : "Nuevo producto"}</h2>
            <p className="text-sm text-gray-600 mt-1">{isEditing ? product!.name : "Registrar equipo o producto"}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white border border-gray-200 text-gray-800 px-4 py-2 text-sm rounded-sm hover:border-[#002D72]"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Nombre</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
            />
            {errors.name && <p className="text-xs text-gray-500">{errors.name}</p>}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Categoria</span>
            <select
              value={form.category}
              onChange={(e) => field("category", e.target.value as ProductCategory)}
              className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isSerialized}
              onChange={() => field("isSerialized", !form.isSerialized)}
              className="h-4 w-4 border-gray-300"
            />
            <span className="text-sm text-gray-700">Equipo serializado</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D] disabled:opacity-50"
            >
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
