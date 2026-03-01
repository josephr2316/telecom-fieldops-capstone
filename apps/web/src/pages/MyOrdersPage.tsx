import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import Layout from "../layouts/Layout";
import PageNavigation from "../components/PageNavigation";
import StatusBanner from "../components/StatusBanner";
import LoadingState from "../components/LoadingState";
import {
  getOfflineQueue,
  pushToOfflineQueue,
  removeOfflineQueueItem,
  setOfflineQueue,
  type OfflineQueueItem,
} from "../utils/offlineQueue";

type ChecklistItem = { id: string; label: string; completed: boolean };

type WorkOrder = {
  id: string;
  type: string;
  status: string;
  customerId: string;
  branchId?: string;
  planId?: string;
  assignedTechUserId?: string;
  version: number;
  items?: { productId: string; qty: number }[];
  technicianNotes?: string | null;
  checklist?: ChecklistItem[] | null;
  createdAt: string;
  updatedAt: string;
  allowedTransitions: string[];
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "1", label: "Verificar equipo en sitio", completed: false },
  { id: "2", label: "Comprobar señal", completed: false },
  { id: "3", label: "Documentar resultado", completed: false },
];

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [queue, setQueue] = useState<OfflineQueueItem[]>(() => getOfflineQueue());

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiClient.get<WorkOrder[]>("/api/v1/work-orders");
      setOrders(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error cargando órdenes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setQueue(getOfflineQueue());
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Flush offline queue when back online
  useEffect(() => {
    if (!isOnline) return;
    const q = getOfflineQueue();
    if (q.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const item of q) {
        if (cancelled) break;
        try {
          if (item.op === "PATCH_TECH_DETAILS") {
            await apiClient.patch(`/api/v1/work-orders/${encodeURIComponent(item.workOrderId)}/tech-details`, item.payload);
          } else if (item.op === "PATCH_STATUS") {
            await apiClient.patch(`/api/v1/work-orders/${encodeURIComponent(item.workOrderId)}/status`, item.payload);
          }
          removeOfflineQueueItem(item.id);
        } catch {
          break;
        }
      }
      if (!cancelled) {
        setQueue(getOfflineQueue());
        void loadOrders();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline, loadOrders]);

  const updateLocalOrder = (id: string, patch: Partial<WorkOrder>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  };

  const saveTechDetails = async (order: WorkOrder, technicianNotes: string | null, checklist: ChecklistItem[] | null) => {
    const payload = { technicianNotes, checklist };
    if (isOnline) {
      try {
        const updated = await apiClient.patch<WorkOrder>(
          `/api/v1/work-orders/${encodeURIComponent(order.id)}/tech-details`,
          payload
        );
        updateLocalOrder(order.id, updated);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Error guardando");
      }
    } else {
      pushToOfflineQueue({ op: "PATCH_TECH_DETAILS", workOrderId: order.id, payload });
      updateLocalOrder(order.id, { technicianNotes: technicianNotes ?? undefined, checklist: checklist ?? undefined });
      setQueue(getOfflineQueue());
    }
  };

  const handleStatusChange = async (order: WorkOrder, newStatus: string) => {
    const payload = { newStatus, baseVersion: order.version };
    if (isOnline) {
      try {
        await apiClient.patch(`/api/v1/work-orders/${encodeURIComponent(order.id)}/status`, payload);
        void loadOrders();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Error actualizando estado");
      }
    } else {
      pushToOfflineQueue({ op: "PATCH_STATUS", workOrderId: order.id, payload });
      updateLocalOrder(order.id, { status: newStatus, version: order.version + 1 });
      setQueue(getOfflineQueue());
    }
  };

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [checklistDraft, setChecklistDraft] = useState<Record<string, ChecklistItem[]>>({});

  const openExpand = (wo: WorkOrder) => {
    setExpandedId(wo.id);
    setNotesDraft((prev) => ({ ...prev, [wo.id]: wo.technicianNotes ?? "" }));
    setChecklistDraft((prev) => ({
      ...prev,
      [wo.id]: (wo.checklist && wo.checklist.length > 0) ? [...wo.checklist] : DEFAULT_CHECKLIST.map((c) => ({ ...c })),
    }));
  };

  const toggleChecklistItem = (orderId: string, itemId: string) => {
    setChecklistDraft((prev) => {
      const list = prev[orderId] ?? DEFAULT_CHECKLIST.map((c) => ({ ...c }));
      return {
        ...prev,
        [orderId]: list.map((c) => (c.id === itemId ? { ...c, completed: !c.completed } : c)),
      };
    });
  };

  const addChecklistItem = (orderId: string) => {
    setChecklistDraft((prev) => {
      const list = prev[orderId] ?? DEFAULT_CHECKLIST.map((c) => ({ ...c }));
      const nextId = String(Math.max(0, ...list.map((c) => parseInt(c.id, 10) || 0)) + 1);
      return { ...prev, [orderId]: [...list, { id: nextId, label: "Nuevo ítem", completed: false }] };
    });
  };

  const currentQueue = queue.length > 0 ? getOfflineQueue() : queue;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation />
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <button onClick={() => navigate("/home")} className="text-sm text-gray-600 hover:text-gray-800 mb-3">
              Volver al panel principal
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">Mis órdenes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Órdenes asignadas: checklist, notas y cambio de estado. Los cambios se guardan offline si no hay conexión.
            </p>
            {!isOnline && (
              <StatusBanner
                tone="warning"
                title="Sin conexion"
                message="Los cambios se guardaran en cola y se enviaran al recuperar la red."
                className="mt-4"
              />
            )}
            {isOnline && currentQueue.length > 0 && (
              <StatusBanner
                tone="success"
                title="Sincronizacion en progreso"
                message={`Cola pendiente: ${currentQueue.length} cambio(s).`}
                detail="Los cambios offline se estan enviando al servidor."
                className="mt-4"
              />
            )}
          </header>

          {message && (
            <StatusBanner
              tone="error"
              title="Error en mis ordenes"
              message={message}
              className="mb-6"
              role="alert"
            />
          )}

          <section className="bg-white border border-gray-200 rounded-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Lista de órdenes asignadas</h2>
            {loading ? (
              <LoadingState label="Cargando ordenes asignadas..." />
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-600">No hay órdenes asignadas.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((wo) => (
                  <div key={wo.id} className="border border-gray-200 rounded p-4">
                    <div
                      className="flex flex-wrap items-center gap-3 cursor-pointer"
                      onClick={() => (expandedId === wo.id ? setExpandedId(null) : openExpand(wo))}
                    >
                      <span className="font-mono text-sm">{wo.id}</span>
                      <span className="text-sm text-gray-600">{wo.type}</span>
                      <span className="text-sm font-medium">{wo.status}</span>
                      <span className="text-sm text-gray-600">Cliente: {wo.customerId}</span>
                      {wo.allowedTransitions.length > 0 && (
                        <select
                          className="border border-gray-300 px-2 py-1 text-sm"
                          value=""
                          onChange={(e) => {
                            e.stopPropagation();
                            const v = e.target.value;
                            if (v) handleStatusChange(wo, v);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Cambiar estado</option>
                          {wo.allowedTransitions.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {expandedId === wo.id ? "▼ Ocultar" : "▶ Ver checklist y notas"}
                      </span>
                    </div>

                    {expandedId === wo.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notas del técnico</label>
                          <textarea
                            className="w-full border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                            value={notesDraft[wo.id] ?? wo.technicianNotes ?? ""}
                            onChange={(e) => setNotesDraft((prev) => ({ ...prev, [wo.id]: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="mt-2 bg-[#002D72] text-white px-4 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                            onClick={() =>
                              saveTechDetails(
                                wo,
                                notesDraft[wo.id] ?? wo.technicianNotes ?? null,
                                checklistDraft[wo.id] ?? wo.checklist ?? null
                              )
                            }
                          >
                            Guardar notas y checklist
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Checklist</label>
                          <ul className="space-y-2">
                            {(checklistDraft[wo.id] ?? wo.checklist ?? DEFAULT_CHECKLIST).map((c) => (
                              <li key={c.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={c.completed}
                                  onChange={() => toggleChecklistItem(wo.id, c.id)}
                                />
                                <span className="text-sm">{c.label}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className="mt-2 text-sm text-[#002D72] hover:underline"
                            onClick={() => addChecklistItem(wo.id)}
                          >
                            + Añadir ítem
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
