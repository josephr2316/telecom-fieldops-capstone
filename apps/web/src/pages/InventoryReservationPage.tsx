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

export default function InventoryReservationPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [branchRows] = await Promise.all([apiClient.get<Branch[]>("/api/v1/inventory/branches")]);
        setBranches(branchRows);
        const firstBranchId = branchRows[0]?.id ?? "";
        setSelectedBranchId(firstBranchId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Error cargando datos");
      }
    };

    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedBranchId) {
      setInventoryRows([]);
      return;
    }
    const loadInventory = async () => {
      try {
        const rows = await apiClient.get<InventoryRow[]>(
          `/api/v1/inventory?branchId=${encodeURIComponent(selectedBranchId)}`
        );
        setInventoryRows(rows);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Error cargando inventario");
      }
    };

    void loadInventory();
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
            <h1 className="text-2xl font-semibold text-gray-800">Reserva de inventario</h1>
            <p className="text-sm text-gray-600 mt-1">Visualiza disponibilidad de equipos por sucursal.</p>
          </header>

          <section className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <label className="block max-w-sm">
              <span className="text-sm text-gray-700">Sucursal</span>
              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="mt-2 block w-full border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {message ? (
            <div className="bg-white border border-gray-200 rounded-sm p-4 text-sm text-gray-700 mb-6">{message}</div>
          ) : null}

          <section className="bg-white border border-gray-200 rounded-sm p-6">
            <InventoryTable rows={inventoryRows} />
          </section>
        </div>
      </div>
    </Layout>
  );
}
