import { useLocation, useNavigate } from "react-router-dom";

const SEGMENT_LABELS: Record<string, string> = {
  home: "Inicio",
  plans: "Planes",
  catalog: "Catalogo",
  reserve: "Reservas",
  inventory: "Inventario",
  "work-orders": "Ordenes",
  "my-orders": "Mis Ordenes",
  dashboard: "Dashboard",
};

function formatSegment(segment: string): string {
  const normalized = segment.toLowerCase();
  if (SEGMENT_LABELS[normalized]) {
    return SEGMENT_LABELS[normalized];
  }

  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PageNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb = ["Inicio", ...segments.map(formatSegment)];

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600">
          {breadcrumb.map((item, index) => (
            <span key={`${item}-${index}`}>
              {index > 0 ? " / " : ""}
              {index === breadcrumb.length - 1 ? (
                <span className="text-gray-800 font-semibold">{item}</span>
              ) : (
                item
              )}
            </span>
          ))}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
        >
          Volver a la pagina anterior
        </button>
      </div>
    </section>
  );
}
