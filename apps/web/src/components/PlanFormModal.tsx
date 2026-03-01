import React, { useEffect, useState } from "react";
import { Plan, CreatePlanDto, PlanType, Currency, PLAN_TYPE_LABELS } from "../types/catalog";

interface PlanFormModalProps {
  open: boolean;
  plan?: Plan | null;
  saving: boolean;
  onSave: (dto: CreatePlanDto) => void;
  onClose: () => void;
}

const EMPTY_FORM: CreatePlanDto = {
  name: "",
  type: "HOME_INTERNET",
  price: 0,
  currency: "DOP",
  isActive: true,
};

const PLAN_TYPES: PlanType[] = ["HOME_INTERNET", "MOBILE_DATA", "VOICE", "BUSINESS"];
const CURRENCIES: Currency[] = ["DOP", "USD"];

export function PlanFormModal({ open, plan, saving, onSave, onClose }: PlanFormModalProps) {
  const [form, setForm] = useState<CreatePlanDto>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreatePlanDto, string>>>({});

  const isEditing = Boolean(plan);

  useEffect(() => {
    if (open) {
      setForm(
        plan
          ? {
              name: plan.name,
              type: plan.type,
              price: plan.price,
              currency: plan.currency,
              isActive: plan.isActive,
            }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [open, plan]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "El nombre es requerido.";
    if (form.price <= 0) e.price = "El precio debe ser mayor a 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSave(form);
  }

  function field<K extends keyof CreatePlanDto>(key: K, value: CreatePlanDto[K]) {
    setForm((f: CreatePlanDto) => ({ ...f, [key]: value }));
    setErrors((e: Record<string, string | undefined>) => ({ ...e, [key]: undefined }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{isEditing ? "Editar plan" : "Nuevo plan"}</h2>
            <p className="text-sm text-gray-600 mt-1">{isEditing ? plan!.name : "Crear plan de servicio"}</p>
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
            <span className="text-sm text-gray-700">Tipo de plan</span>
            <select
              value={form.type}
              onChange={(e) => field("type", e.target.value as PlanType)}
              className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
            >
              {PLAN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PLAN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-700">Precio</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => field("price", parseFloat(e.target.value) || 0)}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              />
              {errors.price && <p className="text-xs text-gray-500">{errors.price}</p>}
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-700">Moneda</span>
              <select
                value={form.currency}
                onChange={(e) => field("currency", e.target.value as Currency)}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={() => field("isActive", !form.isActive)}
              className="h-4 w-4 border-gray-300"
            />
            <span className="text-sm text-gray-700">Plan activo</span>
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
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
