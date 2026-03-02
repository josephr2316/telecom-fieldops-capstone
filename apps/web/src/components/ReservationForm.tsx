import { useState } from "react";

type Product = {
  id: string;
  name: string;
};

type Props = {
  products: Product[];
  loading: boolean;
  onReserve: (input: { workOrderId: string; productId: string; qty: number }) => Promise<void>;
  onRelease: (workOrderId: string) => Promise<void>;
};

export default function ReservationForm({ products, loading, onReserve, onRelease }: Props) {
  const [workOrderId, setWorkOrderId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);

  const canSubmit = workOrderId.trim() && productId.trim() && qty > 0 && !loading;

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-6">
      <div className="grid gap-4 max-w-xl">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-700">Work Order ID</span>
          <input
            value={workOrderId}
            onChange={(event) => setWorkOrderId(event.target.value)}
            placeholder="wo_10001"
            className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-700">Producto</span>
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
          >
            <option value="">Seleccionar producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-700">Cantidad</span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(event) => setQty(Number(event.target.value))}
            className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
          />
        </label>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onReserve({ workOrderId: workOrderId.trim(), productId, qty })}
            className="bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D] disabled:opacity-50"
          >
            Reservar
          </button>
          <button
            type="button"
            disabled={!workOrderId.trim() || loading}
            onClick={() => onRelease(workOrderId.trim())}
            className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72] disabled:opacity-50"
          >
            Liberar reserva
          </button>
        </div>
      </div>
    </section>
  );
}
