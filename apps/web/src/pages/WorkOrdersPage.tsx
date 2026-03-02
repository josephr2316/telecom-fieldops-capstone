import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import Layout from "../layouts/Layout";
import PageNavigation from "../components/PageNavigation";
import StatusBanner from "../components/StatusBanner";
import LoadingState from "../components/LoadingState";

type WorkOrderItem = {
  productId: string;
  qty: number;
};

type WorkOrder = {
  id: string;
  type: string;
  status: string;
  customerId: string;
  branchId?: string;
  planId?: string;
  assignedTechUserId?: string;
  version: number;
  items?: WorkOrderItem[];
  createdAt: string;
  updatedAt: string;
  allowedTransitions: string[];
};

const WORK_ORDER_TYPES = [
  "NEW_SERVICE_INSTALL",
  "CLAIM_TROUBLESHOOT",
  "PLAN_AND_EQUIPMENT_SALE",
  "EQUIPMENT_ONLY_SALE",
  "MONTHLY_PAYMENT",
  "SERVICE_UPGRADE",
  "SERVICE_DOWN_OUTAGE",
];

export default function WorkOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [newType, setNewType] = useState(WORK_ORDER_TYPES[0]);
  const [newCustomer, setNewCustomer] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [newItems, setNewItems] = useState<WorkOrderItem[]>([]);
  const [creating, setCreating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<WorkOrder[]>("/api/v1/work-orders");
      setOrders(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error cargando ordenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setMessage("");
    try {
      await apiClient.post("/api/v1/work-orders", {
        type: newType,
        customerId: newCustomer,
        branchId: newBranch || undefined,
        planId: newPlan || undefined,
        items: newItems.length ? newItems : undefined,
      });
      setNewCustomer("");
      setNewBranch("");
      setNewPlan("");
      setNewItems([]);
      await loadOrders();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (order: WorkOrder, newStatus: string) => {
    try {
      await apiClient.patch(`/api/v1/work-orders/${encodeURIComponent(order.id)}/status`, {
        newStatus,
        baseVersion: order.version,
      });
      await loadOrders();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error actualizando estado");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation /> 
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <button onClick={() => navigate("/home")} className="text-sm text-gray-600 hover:text-gray-800 mb-3">
              Volver al panel principal
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">Ordenes de trabajo</h1>
            <p className="text-sm text-gray-600 mt-1">Crea solicitudes y gestiona sus cambios de estado.</p>
          </header>

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Nueva orden</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700">Tipo</span>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
                >
                  {WORK_ORDER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Cliente (ID)</span>
                <input
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Sucursal ID</span>
                <input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Plan ID</span>
                <input
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
                />
              </label>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newCustomer}
              className="mt-4 bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D] disabled:opacity-50"
            >
              Crear orden
            </button>
          </section>

          {message && (
            <StatusBanner
              tone="error"
              title="Error en ordenes de trabajo"
              message={message}
              className="mb-6"
              role="alert"
            />
          )}

          <section className="bg-white border border-gray-200 rounded-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Lista de ordenes</h2>
            {loading ? (
              <LoadingState label="Cargando ordenes de trabajo..." />
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-600">No hay ordenes creadas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">ID</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">Estado</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">Cliente</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">Sucursal</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">Version</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((wo) => (
                      <tr key={wo.id} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.status}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.customerId}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.branchId ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.version}</td>
                        <td className="px-4 py-3">
                          {wo.allowedTransitions.length > 0 && (
                            <select
                              onChange={(e) => handleStatusChange(wo, e.target.value)}
                              className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
                            >
                              <option value="">-</option>
                              {wo.allowedTransitions.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
