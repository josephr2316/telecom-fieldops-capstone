import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InventoryTable from "../components/InventoryTable";
import { apiClient } from "../services/apiClient";
import Layout from "../layouts/Layout";
import PageNavigation from "../components/PageNavigation";

type Branch = {
  id: string;
  name: string;
  isMain: boolean;
};

type InventoryRow = {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  qtyAvailable: number;
  qtyReserved: number;
  updatedAt: string;
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [branchRows] = await Promise.all([apiClient.get<Branch[]>("/api/v1/inventory/branches")]);
        setBranches(branchRows);
        const first = branchRows[0]?.id ?? "";
        setSelectedBranchId(first);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Error cargando sucursales");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selectedBranchId) {
      setInventoryRows([]);
      return;
    }
    const loadInv = async () => {
      try {
        const rows = await apiClient.get<InventoryRow[]>(
          `/api/v1/inventory?branchId=${encodeURIComponent(selectedBranchId)}`
        );
        setInventoryRows(rows);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Error cargando inventario");
      }
    };
    void loadInv();
  }, [selectedBranchId]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <PageNavigation />
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <button onClick={() => navigate("/home")} className="text-sm text-gray-600 hover:text-gray-800 mb-3">
              Volver al panel principal
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">Inventario por sucursal</h1>
            <p className="text-sm text-gray-600 mt-1">
              Consulta la disponibilidad de productos segun la sucursal seleccionada.
            </p>
          </header>

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <label className="block max-w-sm">
              <span className="text-sm text-gray-700">Sucursal</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="mt-2 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {message && (
            <div className="bg-white border border-gray-200 rounded-sm p-4 text-sm text-gray-700 mb-6">{message}</div>
          )}

          <section className="bg-white border border-gray-200 rounded-sm p-6">
            <InventoryTable rows={inventoryRows} />
          </section>
        </div>
      </div>
    </Layout>
  );
}
