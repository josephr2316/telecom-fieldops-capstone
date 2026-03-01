import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";

interface NavCard {
  title: string;
  description: string;
  path: string;
}

const NAV_CARDS: NavCard[] = [
  {
    title: "Catalogo de Planes",
    description: "Gestiona la disponibilidad de planes comerciales.",
    path: "/plans",
  },
  {
    title: "Catalogo de Productos",
    description: "Consulta los equipos y productos disponibles.",
    path: "/catalog",
  },
  {
    title: "Reserva de Inventario",
    description: "Reserva equipos para ordenes de trabajo.",
    path: "/reserve",
  },
  {
    title: "Inventario por Sucursal",
    description: "Revisa existencias disponibles por ubicacion.",
    path: "/inventory",
  },
  {
    title: "Ordenes de Trabajo",
    description: "Crea y gestiona solicitudes operativas.",
    path: "/work-orders",
  },
  {
    title: "Dashboard Operativo",
    description: "Monitorea KPIs y alertas de operacion.",
    path: "/dashboard",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser) as { email?: string };
        setUsername(user.email?.split("@")[0] ?? "");
      } else {
        const payload = JSON.parse(atob(token.split(".")[1])) as { email?: string; sub?: string };
        setUsername(payload.email?.split("@")[0] ?? payload.sub ?? "");
      }
    } catch {
      setUsername("");
    }
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 text-gray-800">
          <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Panel principal</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Bienvenido{username ? `, ${username}` : ""}. Selecciona un modulo para continuar.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white border border-gray-200 text-gray-800 px-5 py-2 text-sm rounded-sm hover:border-[#002D72]"
              >
                Cerrar sesion
              </button>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {NAV_CARDS.map((card) => (
              <article key={card.path} className="bg-white border border-gray-200 rounded-sm p-6 flex flex-col">
                <h2 className="text-2xl font-semibold text-gray-800">{card.title}</h2>
                <p className="text-sm text-gray-600 mt-2">{card.description}</p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate(card.path)}
                    className="bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D]"
                  >
                    Ir al modulo
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}