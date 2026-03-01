import { Plan } from "../types/plans";

interface PlanCardProps {
  plan: Plan;
  onToggle: (plan: Plan) => void;
  isToggling: boolean;
}

function formatPrice(amount: number, currency = "DOP"): string {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(amount);
}

export function PlanCard({ plan, onToggle, isToggling }: PlanCardProps) {
  const isActive = plan.status === "ACTIVE";

  return (
    <article className="bg-white border border-gray-200 rounded-sm p-6">
      <p className="text-xs text-gray-500">{plan.category}</p>
      <h3 className="text-2xl font-semibold text-gray-800 mt-2">{plan.name}</h3>
      <p className="text-sm text-gray-600 mt-2">{plan.description}</p>

      <div className="mt-4 space-y-1">
        {plan.downloadSpeedMbps !== null && (
          <p className="text-sm text-gray-600">Descarga: {plan.downloadSpeedMbps} Mbps</p>
        )}
        {plan.uploadSpeedMbps !== null && (
          <p className="text-sm text-gray-600">Subida: {plan.uploadSpeedMbps} Mbps</p>
        )}
        {plan.dataLimitGB !== null && <p className="text-sm text-gray-600">Datos: {plan.dataLimitGB} GB</p>}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-2xl font-semibold text-gray-800">{formatPrice(plan.monthlyPrice, plan.currency)}</p>
        <button
          onClick={() => onToggle(plan)}
          disabled={isToggling}
          className={
            isActive
              ? "bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72] disabled:opacity-50"
              : "bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D] disabled:opacity-50"
          }
        >
          {isToggling ? "Procesando..." : isActive ? "Desactivar" : "Activar"}
        </button>
      </div>
    </article>
  );
}
