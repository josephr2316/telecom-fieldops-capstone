import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plan, PlanCategory, PlanStatus } from "../types/plans";
import { usePlans } from "./usePlans";
import { PlanCard } from "./PlanCard";
import Layout from "../layouts/Layout";
import PageNavigation from "./PageNavigation";
import StatusBanner from "./StatusBanner";

type StatusFilter = "ALL" | PlanStatus;
type CategoryFilter = "ALL" | PlanCategory;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Activos", value: "ACTIVE" },
  { label: "Inactivos", value: "INACTIVE" },
];

const CATEGORY_FILTERS: { label: string; value: CategoryFilter }[] = [
  { label: "Todas", value: "ALL" },
  { label: "Residencial", value: "RESIDENCIAL" },
  { label: "Movil", value: "MOVIL" },
  { label: "Empresarial", value: "EMPRESARIAL" },
  { label: "TV", value: "TV" },
];

export function PlansPage() {
  const navigate = useNavigate();
  const { plans, loading, error, togglingId, togglePlanStatus, refresh } = usePlans();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");

  const filtered = useMemo<Plan[]>(() => {
    const q = search.toLowerCase();
    return plans.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [plans, search, statusFilter, categoryFilter]);

  const stats = useMemo(
    () => ({
      total: plans.length,
      active: plans.filter((p) => p.status === "ACTIVE").length,
      inactive: plans.filter((p) => p.status === "INACTIVE").length,
    }),
    [plans]
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation />

          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <button onClick={() => navigate("/home")} className="text-sm text-gray-600 hover:text-gray-800 mb-3">
                  Volver al panel principal
                </button>
                <h1 className="text-2xl font-semibold text-gray-800">Catalogo de planes</h1>
                <p className="text-sm text-gray-600 mt-1">Gestiona disponibilidad y estado de planes comerciales.</p>
              </div>
              <button
                onClick={refresh}
                disabled={loading}
                className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72] disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">{stats.total}</p>
            </article>
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">{stats.active}</p>
            </article>
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Inactivos</p>
              <p className="text-2xl font-semibold text-gray-800 mt-2">{stats.inactive}</p>
            </article>
          </section>

          {error && (
            <StatusBanner
              tone="error"
              title="No se pudo cargar el catalogo de planes"
              message={error}
              className="mb-6"
              role="alert"
            />
          )}

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <input
                type="search"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Buscar plan"
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    Estado: {f.label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              >
                {CATEGORY_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    Categoria: {f.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {loading && plans.length === 0 ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-sm p-6">
                  <div className="h-4 bg-gray-100 mb-3" />
                  <div className="h-4 bg-gray-100 mb-3" />
                  <div className="h-8 bg-gray-100" />
                </div>
              ))}
            </section>
          ) : filtered.length === 0 ? (
            <section className="bg-white border border-gray-200 rounded-sm p-6 text-center">
              <p className="text-sm text-gray-600">No se encontraron planes con los filtros aplicados.</p>
            </section>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onToggle={togglePlanStatus} isToggling={togglingId === plan.id} />
              ))}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}
