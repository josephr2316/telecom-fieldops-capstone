import { ReactNode, useMemo } from "react";

type StoredUser = {
  email?: string;
  roles?: string[];
};

const Layout = ({ children }: { children: ReactNode }) => {
  const userDisplay = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) {
        return { name: "Usuario", role: "Sin rol" };
      }

      const user = JSON.parse(rawUser) as StoredUser;
      const name = user.email ?? "Usuario";
      const role = user.roles?.[0] ?? "Sin rol";
      return { name, role };
    } catch {
      return { name: "Usuario", role: "Sin rol" };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-[#002D72] text-white text-xs">
        <div className="max-w-6xl mx-auto px-6 py-2 flex justify-between"> 
        </div>
      </div>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#002D72] rounded-sm flex items-center justify-center text-white font-bold text-lg">
              TF
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Telecom Fieldops Capstone</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-9 h-9 bg-[#002D72] rounded-full">
              <span className="flex items-center justify-center font-extrabold text-2xl text-white">{ userDisplay.name[0] }</span>
            </div>
            <div>
              <p className="font-medium">{userDisplay.name}</p>
              <p className="text-xs text-gray-500">{userDisplay.role}</p>
            </div>
          </div>
        </div>

      </header>

      <main className="py-10 flex-1">
        <div className="max-w-6xl mx-auto px-6">{children}</div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-gray-500 flex justify-between">
          <span>© 2026 Telecom Fieldops Capstone. Todos los derechos reservados.</span>
          <span>Terminos y Condiciones · Politica de Privacidad</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
