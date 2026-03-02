import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { authService } from "../services/auth";

type StoredUser = {
  email?: string;
  roles?: string[];
};

const NAV_ITEMS = [
  { to: "/home", label: "Inicio" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/plans", label: "Planes" },
  { to: "/catalog", label: "Catalogo" },
  { to: "/reserve", label: "Reservas" },
  { to: "/inventory", label: "Inventario" },
  { to: "/work-orders", label: "Ordenes" },
  { to: "/my-orders", label: "Mis ordenes" },
] as const;

function resolveUserDisplay(): { name: string; role: string } {
  const sessionUser = authService.getSession()?.user;
  if (sessionUser?.email) {
    return {
      name: sessionUser.email,
      role: sessionUser.roles?.[0] ?? "Sin rol",
    };
  }

  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      return { name: "Usuario", role: "Sin rol" };
    }

    const user = JSON.parse(rawUser) as StoredUser;
    return {
      name: user.email ?? "Usuario",
      role: user.roles?.[0] ?? "Sin rol",
    };
  } catch {
    return { name: "Usuario", role: "Sin rol" };
  }
}

const Layout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const userDisplay = resolveUserDisplay();

  const handleLogout = async () => {
    await authService.logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-[#002D72] text-white text-xs">
        <div className="max-w-6xl mx-auto px-6 py-2 flex justify-between" />
      </div>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#002D72] rounded-sm flex items-center justify-center text-white font-bold text-lg">
              TF
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Telecom Fieldops Capstone</h1>
              <p className="text-xs text-gray-500">Ir al dashboard</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-9 h-9 bg-[#002D72] rounded-full">
              <span className="flex items-center justify-center font-extrabold text-2xl text-white">
                {(userDisplay.name[0] ?? "U").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium">{userDisplay.name}</p>
              <p className="text-xs text-gray-500">{userDisplay.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white border border-gray-200 text-gray-800 px-3 py-2 text-sm rounded-sm hover:border-[#002D72]"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "bg-[#002D72] text-white px-4 py-2 text-sm rounded-sm"
                  : "bg-white border border-gray-200 text-gray-800 px-4 py-2 text-sm rounded-sm hover:border-[#002D72]"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="py-10 flex-1">
        <div className="max-w-6xl mx-auto px-6">{children}</div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-gray-500 flex justify-between">
          <span>(c) 2026 Telecom Fieldops Capstone. Todos los derechos reservados.</span>
          <span>Terminos y Condiciones | Politica de Privacidad</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
