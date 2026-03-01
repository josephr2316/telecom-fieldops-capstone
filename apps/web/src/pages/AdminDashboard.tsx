import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../layouts/Layout";
import PageNavigation from "../components/PageNavigation";
import { apiClient } from "../services/apiClient";
import { ApiError } from "../types/plans";

type Kpi = {
  label: string;
  value: string;
  detail: string;
};

type BranchPerformance = {
  branchId: string;
  branch: string;
  completionRate: number;
  openOrders: number;
};

type TicketByType = {
  type: string;
  count: number;
};

type DashboardTab = "resumen" | "rendimiento" | "tickets" | "alertas";

type DashboardCard = {
  id: string;
  label: string;
  value: number;
  unit?: string;
};

type KpiByBranch = {
  branchId?: string;
  branchName?: string;
  criticalItems?: number;
};

type DashboardKpis = {
  kpi01CreatedTodayByType?: { byType?: Record<string, number> };
  kpi06CriticalInventoryByBranch?: { byBranch?: KpiByBranch[] };
};

type DashboardKpiResponse = {
  generatedAt: string;
  timezone: string;
  cards: DashboardCard[];
  kpis?: DashboardKpis;
};

type WorkOrder = {
  id: string;
  type: string;
  status: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
};

type RecentActivity = {
  time: string;
  event: string;
  branch: string;
  status: string;
};

type AlertItem = {
  id: string;
  text: string;
  detail: string;
};

type PeriodOption = {
  id: string;
  label: string;
  days: 1 | 7 | 30;
};

type BranchOption = {
  id: string;
  label: string;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: "today", label: "Hoy", days: 1 },
  { id: "7d", label: "Ultimos 7 dias", days: 7 },
  { id: "30d", label: "Ultimos 30 dias", days: 30 },
];

const TABS: { id: DashboardTab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "rendimiento", label: "Rendimiento por sucursal" },
  { id: "tickets", label: "Tickets" },
  { id: "alertas", label: "Alertas" },
];

const TERMINAL_STATUSES = new Set(["COMPLETED", "REJECTED", "CANCELLED"]);

function safeDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPeriodCutoff(days: 1 | 7 | 30): Date {
  const now = new Date();
  if (days === 1) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(PERIOD_OPTIONS[1].id);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<"period" | "branch" | null>(null);
  const [openModal, setOpenModal] = useState<"summary" | "alerts" | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("resumen");

  const [dashboardPayload, setDashboardPayload] = useState<DashboardKpiResponse | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedPeriod = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.id === selectedPeriodId) ?? PERIOD_OPTIONS[1],
    [selectedPeriodId]
  );

  const branchOptions = useMemo<BranchOption[]>(() => {
    const map = new Map<string, string>();

    const byBranch = dashboardPayload?.kpis?.kpi06CriticalInventoryByBranch?.byBranch ?? [];
    byBranch.forEach((entry) => {
      if (entry.branchId) {
        map.set(entry.branchId, entry.branchName ?? entry.branchId);
      }
    });

    workOrders.forEach((order) => {
      if (order.branchId && !map.has(order.branchId)) {
        map.set(order.branchId, order.branchId);
      }
    });

    const dynamicOptions = [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ id: "all", label: "Todas las sucursales" }, ...dynamicOptions];
  }, [dashboardPayload, workOrders]);

  useEffect(() => {
    if (!branchOptions.some((option) => option.id === selectedBranch)) {
      setSelectedBranch("all");
    }
  }, [branchOptions, selectedBranch]);

  const ordersFilteredByPeriod = useMemo(() => {
    const cutoff = getPeriodCutoff(selectedPeriod.days);
    return workOrders.filter((order) => {
      const createdAt = safeDate(order.createdAt);
      return createdAt ? createdAt >= cutoff : false;
    });
  }, [workOrders, selectedPeriod.days]);

  const filteredOrders = useMemo(() => {
    if (selectedBranch === "all") {
      return ordersFilteredByPeriod;
    }
    return ordersFilteredByPeriod.filter((order) => order.branchId === selectedBranch);
  }, [ordersFilteredByPeriod, selectedBranch]);

  const kpiData = useMemo<Kpi[]>(() => {
    if (!dashboardPayload) {
      return [];
    }

    const cards = dashboardPayload.cards ?? [];
    const generatedAt = safeDate(dashboardPayload.generatedAt);
    const detail = generatedAt
      ? `Actualizado ${generatedAt.toLocaleTimeString()} (${dashboardPayload.timezone})`
      : `Actualizado (${dashboardPayload.timezone})`;

    return cards.slice(0, 4).map((card) => {
      const value =
        card.unit === "percent"
          ? `${card.value}%`
          : card.unit === "hours"
          ? `${card.value} h`
          : String(card.value);

      return {
        label: card.label,
        value,
        detail,
      };
    });
  }, [dashboardPayload]);

  const branchLabelById = useMemo(() => {
    const map = new Map<string, string>();
    branchOptions.forEach((option) => {
      if (option.id !== "all") {
        map.set(option.id, option.label);
      }
    });
    return map;
  }, [branchOptions]);

  const branchPerformance = useMemo<BranchPerformance[]>(() => {
    const branchIds = selectedBranch === "all"
      ? branchOptions.filter((option) => option.id !== "all").map((option) => option.id)
      : [selectedBranch];

    const rows = branchIds.map((branchId) => {
      const orders = ordersFilteredByPeriod.filter((order) => order.branchId === branchId);
      const total = orders.length;
      const completed = orders.filter((order) => order.status === "COMPLETED").length;
      const openOrders = orders.filter((order) => !TERMINAL_STATUSES.has(order.status)).length;

      return {
        branchId,
        branch: branchLabelById.get(branchId) ?? branchId,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        openOrders,
      };
    });

    return rows.sort((a, b) => b.completionRate - a.completionRate);
  }, [selectedBranch, branchOptions, ordersFilteredByPeriod, branchLabelById]);

  const ticketsByType = useMemo<TicketByType[]>(() => {
    const grouped = filteredOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.type] = (acc[order.type] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([type, count]) => ({ type: formatType(type), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  const recentActivity = useMemo<RecentActivity[]>(() => {
    return [...filteredOrders]
      .sort((a, b) => {
        const first = safeDate(a.updatedAt)?.getTime() ?? 0;
        const second = safeDate(b.updatedAt)?.getTime() ?? 0;
        return second - first;
      })
      .slice(0, 5)
      .map((order) => {
        const updatedAt = safeDate(order.updatedAt);
        return {
          time: updatedAt ? updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
          event: `Orden #${order.id} actualizada a ${formatStatus(order.status)}`,
          branch: order.branchId ? branchLabelById.get(order.branchId) ?? order.branchId : "Sin sucursal",
          status: formatStatus(order.status),
        };
      });
  }, [filteredOrders, branchLabelById]);

  const alerts = useMemo<AlertItem[]>(() => {
    const now = Date.now();

    const staleOpen = filteredOrders.filter((order) => {
      if (TERMINAL_STATUSES.has(order.status)) {
        return false;
      }
      const createdAt = safeDate(order.createdAt);
      if (!createdAt) {
        return false;
      }
      const ageHours = (now - createdAt.getTime()) / (1000 * 60 * 60);
      return ageHours >= 6;
    });

    const conflicts = filteredOrders.filter((order) => order.status === "CONFLICT");
    const onHold = filteredOrders.filter((order) => order.status === "ON_HOLD");

    const items: AlertItem[] = [];

    if (staleOpen.length > 0) {
      items.push({
        id: "stale",
        text: `${staleOpen.length} ordenes llevan 6 horas o mas sin cierre.`,
        detail: "Revisar asignacion tecnica y bloqueos operativos.",
      });
    }

    if (conflicts.length > 0) {
      items.push({
        id: "conflict",
        text: `${conflicts.length} ordenes estan en estado Conflict.`,
        detail: "Validar datos de inventario o transiciones de estado.",
      });
    }

    if (onHold.length > 0) {
      items.push({
        id: "hold",
        text: `${onHold.length} ordenes estan en On Hold.`,
        detail: "Priorizar resolucion para evitar crecimiento de backlog.",
      });
    }

    if (items.length === 0) {
      items.push({
        id: "none",
        text: "No hay alertas criticas para el filtro actual.",
        detail: "Los indicadores operativos no muestran bloqueos urgentes.",
      });
    }

    return items;
  }, [filteredOrders]);

  const summaryInsights = useMemo<string[]>(() => {
    if (filteredOrders.length === 0) {
      return ["No hay suficientes datos para construir un resumen en el periodo seleccionado."];
    }

    const completed = filteredOrders.filter((order) => order.status === "COMPLETED").length;
    const completionRate = Math.round((completed / filteredOrders.length) * 100);

    const topType = ticketsByType[0];
    const branchWithMostOpen = [...branchPerformance].sort((a, b) => b.openOrders - a.openOrders)[0];

    const items: string[] = [`Cumplimiento general: ${completionRate}% (${completed}/${filteredOrders.length}).`];

    if (topType) {
      items.push(`Mayor volumen: ${topType.type} (${topType.count} ordenes).`);
    }

    if (branchWithMostOpen) {
      items.push(`Mayor backlog abierto: ${branchWithMostOpen.branch} (${branchWithMostOpen.openOrders} ordenes).`);
    }

    return items;
  }, [filteredOrders, ticketsByType, branchPerformance]);

  const maxTypeCount = useMemo(
    () => Math.max(...ticketsByType.map((item) => item.count), 1),
    [ticketsByType]
  );

  const loadDashboard = useCallback(async () => {
    setLoadError(null);

    try {
      const [kpiResponse, workOrdersResponse] = await Promise.all([
        apiClient.get<DashboardKpiResponse>("/api/v1/dashboard/kpis"),
        apiClient.get<WorkOrder[]>("/api/v1/work-orders"),
      ]);

      setDashboardPayload(kpiResponse);
      setWorkOrders(workOrdersResponse);
    } catch (error) {
      let message: string;

      if (error instanceof ApiError) {
        if (error.status === 404) {
          message =
            "No se encontro la ruta de dashboard o work orders (404). Verifica despliegue de API y VITE_API_URL.";
        } else if (error.status === 401) {
          message = "Sesion expirada o no autorizado. Inicia sesion de nuevo.";
        } else if (error.status === 403) {
          message = "No tienes permisos para leer KPIs o work orders.";
        } else if (error.status === 502 || error.status === 500) {
          message =
            "La API no responde correctamente (error del servidor). Comprueba que la API este en marcha y que las migraciones esten aplicadas en produccion (Release Command: npm run release).";
        } else {
          message = error.message;
        }
      } else {
        const rawMessage = error instanceof Error ? error.message : "";
        const isNetworkError =
          rawMessage === "Failed to fetch" ||
          rawMessage.toLowerCase().includes("network") ||
          rawMessage.toLowerCase().includes("cors") ||
          (error instanceof TypeError && rawMessage.includes("fetch"));
        if (isNetworkError) {
          message =
            "No se pudo conectar con la API (red, CORS o API caida). Comprueba que la API este en marcha, que VITE_API_URL sea correcta y que en produccion las migraciones esten aplicadas (Release Command: npm run release).";
        } else {
          message = rawMessage || "No se pudo cargar el dashboard desde la API.";
        }
      }

      setLoadError(message);
      setDashboardPayload(null);
      setWorkOrders([]);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation />
          <nav className="bg-white border border-gray-200 rounded-sm mb-6" role="tablist">
            <ul className="px-6 flex gap-10 text-sm text-gray-700">
              {TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "alertas") {
                        setOpenModal("alerts");
                      }
                    }}
                    className={`py-4 border-b-2 font-medium cursor-pointer transition-colors ${
                      activeTab === tab.id
                        ? "border-[#002D72] text-[#002D72]"
                        : "border-transparent hover:text-[#002D72] hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/home")}
                  className="text-sm text-gray-600 hover:text-gray-800 mb-3"
                >
                  Volver al panel principal
                </button>
                <h1 className="text-2xl font-semibold text-gray-800">
                  Dashboard operativo
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Vista consolidada de indicadores operativos y cumplimiento de servicios.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === "period" ? null : "period")}
                    className="bg-white border border-gray-200 rounded-sm px-4 py-2 text-sm text-gray-800 hover:border-[#002D72]"
                  >
                    Periodo: {selectedPeriod.label}
                  </button>
                  {openMenu === "period" && (
                    <div className="absolute right-0 mt-2 min-w-56 bg-white border border-gray-200 rounded-sm z-10">
                      {PERIOD_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedPeriodId(option.id);
                            setOpenMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === "branch" ? null : "branch")}
                    className="bg-white border border-gray-200 rounded-sm px-4 py-2 text-sm text-gray-800 hover:border-[#002D72]"
                  >
                    Sucursal: {branchOptions.find((option) => option.id === selectedBranch)?.label ?? "Todas"}
                  </button>
                  {openMenu === "branch" && (
                    <div className="absolute right-0 mt-2 min-w-64 bg-white border border-gray-200 rounded-sm z-10">
                      {branchOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranch(option.id);
                            setOpenMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {kpiData.length === 0 ? (
              <article className="bg-white border border-gray-200 rounded-sm p-6 md:col-span-2 lg:col-span-4">
                <p className="text-sm text-gray-600">No hay KPIs disponibles para mostrar.</p>
              </article>
            ) : (
              kpiData.map((kpi) => (
                <article key={kpi.label} className="bg-white border border-gray-200 rounded-sm p-6">
                  <p className="text-sm text-gray-600">{kpi.label}</p>
                  <p className="text-2xl font-semibold text-gray-800 mt-2">{kpi.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{kpi.detail}</p>
                </article>
              ))
            )}
          </section>

          {loadError ? (
            <section className="bg-amber-50 border border-amber-200 rounded-sm p-4 mb-6">
              <p className="text-sm text-gray-800 mb-1">
                No se pudieron cargar datos en vivo para el dashboard.
              </p>
              <p className="text-sm text-gray-600">{loadError}</p>
            </section>
          ) : null}

          <section className={`grid gap-6 mb-6 ${activeTab === "resumen" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {(activeTab === "resumen" || activeTab === "rendimiento") && (
              <article className="bg-white border border-gray-200 rounded-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Cumplimiento por sucursal</h2>
                    <p className="text-sm text-gray-600">
                      Porcentaje de ordenes completadas y carga pendiente en el periodo seleccionado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenModal("summary")}
                    className="bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                  >
                    Ver detalle
                  </button>
                </div>
                <div className="space-y-4">
                  {branchPerformance.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay datos de sucursales para el filtro actual.
                    </p>
                  ) : (
                    branchPerformance.map((item) => (
                      <div key={item.branchId}>
                        <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                          <span>{item.branch}</span>
                          <span>{item.completionRate}%</span>
                        </div>
                        <div className="w-full h-3 border border-gray-200 bg-gray-100">
                          <div
                            className="h-full bg-[#002D72]"
                            style={{ width: `${item.completionRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Ordenes abiertas: {item.openOrders}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            )}

            {(activeTab === "resumen" || activeTab === "tickets") && (
              <article className="bg-white border border-gray-200 rounded-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Tickets por tipo</h2>
                    <p className="text-sm text-gray-600">
                      Distribucion de solicitudes registradas en el periodo y sucursal seleccionados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenModal("alerts")}
                    className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
                  >
                    Ver alertas
                  </button>
                </div>
                <div className="space-y-4">
                  {ticketsByType.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay tickets en el filtro actual.
                    </p>
                  ) : (
                    ticketsByType.map((item) => {
                      const ratio = Math.round((item.count / maxTypeCount) * 100);
                      return (
                        <div key={item.type}>
                          <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                            <span>{item.type}</span>
                            <span>{item.count}</span>
                          </div>
                          <div className="w-full h-3 border border-gray-200 bg-gray-100">
                            <div className="h-full bg-[#002D72]" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            )}
          </section>

          {activeTab === "resumen" && (
            <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Actividad reciente</h2>
              <p className="text-sm text-gray-600 mb-6">
                Ultimas ordenes actualizadas para el filtro seleccionado.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 text-sm text-gray-700 font-semibold">Hora</th>
                      <th className="py-3 text-sm text-gray-700 font-semibold">Evento</th>
                      <th className="py-3 text-sm text-gray-700 font-semibold">Sucursal</th>
                      <th className="py-3 text-sm text-gray-700 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.length === 0 ? (
                      <tr>
                        <td className="py-3 text-sm text-gray-600" colSpan={4}>
                          No hay actividad reciente para el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      recentActivity.map((activity) => (
                        <tr key={`${activity.time}-${activity.event}`} className="border-b border-gray-200">
                          <td className="py-3 text-sm text-gray-600">{activity.time}</td>
                          <td className="py-3 text-sm text-gray-600">{activity.event}</td>
                          <td className="py-3 text-sm text-gray-600">{activity.branch}</td>
                          <td className="py-3 text-sm text-gray-600">{activity.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {openModal === "summary" && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-800">Detalle de cumplimiento</h3>
              <p className="text-sm text-gray-600 mt-1">
                Resumen calculado con datos reales del periodo seleccionado.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {summaryInsights.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpenModal(null)}
                  className="bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {openModal === "alerts" && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
            <div className="w-full max-w-xl bg-white border border-gray-200 rounded-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-800">Alertas operativas</h3>
              <p className="text-sm text-gray-600 mt-1">
                Señales detectadas a partir de ordenes reales del filtro actual.
              </p>

              <div className="mt-6 space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border border-gray-200 rounded-sm p-4">
                    <p className="text-sm text-gray-700">{alert.text}</p>
                    <p className="text-xs text-gray-500 mt-2">{alert.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(null)}
                  className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
