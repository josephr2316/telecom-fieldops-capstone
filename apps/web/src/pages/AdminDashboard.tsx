import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../layouts/Layout";
import PageNavigation from "../components/PageNavigation";

type Kpi = {
  label: string;
  value: string;
  detail: string;
};

type BranchPerformance = {
  branch: string;
  completionRate: number;
  openOrders: number;
};

type TicketByType = {
  type: string;
  count: number;
};

const KPI_DATA: Kpi[] = [
  { label: "Ordenes activas", value: "128", detail: "+6 vs semana anterior" },
  { label: "SLA cumplido", value: "94.2%", detail: "+1.8 puntos" },
  { label: "Tiempo medio", value: "4.6 h", detail: "-0.7 h" },
  { label: "Reservas pendientes", value: "23", detail: "3 criticas" },
];

const BRANCH_PERFORMANCE: BranchPerformance[] = [
  { branch: "Santo Domingo Centro", completionRate: 96, openOrders: 18 },
  { branch: "Santiago", completionRate: 91, openOrders: 27 },
  { branch: "La Romana", completionRate: 88, openOrders: 14 },
  { branch: "San Cristobal", completionRate: 93, openOrders: 11 },
];

const TICKETS_BY_TYPE: TicketByType[] = [
  { type: "Instalacion", count: 52 },
  { type: "Averia", count: 31 },
  { type: "Mantenimiento", count: 24 },
  { type: "Retiro de equipo", count: 15 },
];

const PERIOD_OPTIONS = ["Hoy", "Ultimos 7 dias", "Ultimos 30 dias"];
const BRANCH_OPTIONS = ["Todas las sucursales", "Santo Domingo Centro", "Santiago", "La Romana", "San Cristobal"];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[1]);
  const [selectedBranch, setSelectedBranch] = useState(BRANCH_OPTIONS[0]);
  const [openMenu, setOpenMenu] = useState<"period" | "branch" | null>(null);
  const [openModal, setOpenModal] = useState<"summary" | "alerts" | null>(null);

  const maxTypeCount = useMemo(
    () => Math.max(...TICKETS_BY_TYPE.map((item) => item.count), 1),
    []
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation />
          <nav className="bg-white border border-gray-200 rounded-sm mb-6">
            <ul className="px-6 flex gap-10 text-sm text-gray-700">
              <li className="py-4 border-b-2 border-[#002D72] text-[#002D72] font-medium cursor-pointer">
                Resumen
              </li>
              <li className="py-4 hover:text-[#002D72] cursor-pointer">
                Rendimiento por sucursal
              </li>
              <li className="py-4 hover:text-[#002D72] cursor-pointer">
                Tickets
              </li>
              <li className="py-4 hover:text-[#002D72] cursor-pointer">
                Alertas
              </li>
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
                    Periodo: {selectedPeriod}
                  </button>
                  {openMenu === "period" && (
                    <div className="absolute right-0 mt-2 min-w-56 bg-white border border-gray-200 rounded-sm z-10">
                      {PERIOD_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSelectedPeriod(option);
                            setOpenMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {option}
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
                    Sucursal: {selectedBranch}
                  </button>
                  {openMenu === "branch" && (
                    <div className="absolute right-0 mt-2 min-w-64 bg-white border border-gray-200 rounded-sm z-10">
                      {BRANCH_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSelectedBranch(option);
                            setOpenMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {KPI_DATA.map((kpi) => (
              <article key={kpi.label} className="bg-white border border-gray-200 rounded-sm p-6">
                <p className="text-sm text-gray-600">{kpi.label}</p>
                <p className="text-2xl font-semibold text-gray-800 mt-2">{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-2">{kpi.detail}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Cumplimiento por sucursal</h2>
                  <p className="text-sm text-gray-600">
                    Porcentaje de ordenes completadas y carga pendiente.
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
                {BRANCH_PERFORMANCE.map((item) => (
                  <div key={item.branch}>
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
                ))}
              </div>
            </article>

            <article className="bg-white border border-gray-200 rounded-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Tickets por tipo</h2>
                  <p className="text-sm text-gray-600">
                    Distribucion de solicitudes registradas en el periodo seleccionado.
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
                {TICKETS_BY_TYPE.map((item) => {
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
                })}
              </div>
            </article>
          </section>

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Actividad reciente</h2>
            <p className="text-sm text-gray-600 mb-6">
              Eventos de seguimiento para el equipo de operaciones.
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
                  <tr className="border-b border-gray-200">
                    <td className="py-3 text-sm text-gray-600">08:12</td>
                    <td className="py-3 text-sm text-gray-600">Orden #WO-2391 asignada a tecnico</td>
                    <td className="py-3 text-sm text-gray-600">Santiago</td>
                    <td className="py-3 text-sm text-gray-600">En proceso</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 text-sm text-gray-600">09:05</td>
                    <td className="py-3 text-sm text-gray-600">Reserva de ONT confirmada</td>
                    <td className="py-3 text-sm text-gray-600">Santo Domingo Centro</td>
                    <td className="py-3 text-sm text-gray-600">Completado</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm text-gray-600">10:21</td>
                    <td className="py-3 text-sm text-gray-600">Ticket de averia escalado a nivel 2</td>
                    <td className="py-3 text-sm text-gray-600">La Romana</td>
                    <td className="py-3 text-sm text-gray-600">Escalado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {openModal === "summary" && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-sm p-6">
              <h3 className="text-2xl font-semibold text-gray-800">Detalle de cumplimiento</h3>
              <p className="text-sm text-gray-600 mt-1">
                Resumen ejecutivo para comite operativo.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li>- Cumplimiento general: 92.7% en el periodo actual.</li>
                <li>- Mayor volumen de incidencias en el tipo "Averia".</li>
                <li>- Oportunidad de mejora en tiempos de cierre en Santiago.</li>
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
                Tickets que requieren accion inmediata.
              </p>
              <div className="mt-6 border border-gray-200 rounded-sm p-4">
                <p className="text-sm text-gray-700">3 tickets llevan mas de 6 horas sin cierre.</p>
                <p className="text-xs text-gray-500 mt-2">Sucursales impactadas: Santiago y La Romana.</p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(null)}
                  className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
                >
                  Revisar luego
                </button>
                <button
                  type="button"
                  onClick={() => setOpenModal(null)}
                  className="bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                >
                  Atender ahora
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
