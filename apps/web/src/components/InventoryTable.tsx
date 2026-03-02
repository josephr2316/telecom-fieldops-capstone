type InventoryRow = {
  id: string;
  productName: string;
  qtyAvailable: number;
  qtyReserved: number;
  updatedAt: string;
};

type Props = {
  rows: InventoryRow[];
};

export default function InventoryTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-600">No hay inventario para la sucursal seleccionada.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 text-sm text-gray-700 font-semibold">Producto</th>
            <th className="py-3 text-sm text-gray-700 font-semibold text-right">Disponible</th>
            <th className="py-3 text-sm text-gray-700 font-semibold text-right">Reservado</th>
            <th className="py-3 text-sm text-gray-700 font-semibold text-right">Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-200">
              <td className="py-3 text-sm text-gray-600">{row.productName}</td>
              <td className="py-3 text-sm text-gray-600 text-right">{row.qtyAvailable}</td>
              <td className="py-3 text-sm text-gray-600 text-right">{row.qtyReserved}</td>
              <td className="py-3 text-sm text-gray-600 text-right">{new Date(row.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
