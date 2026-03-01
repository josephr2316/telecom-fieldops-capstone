import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { ApiError } from "../types/plans";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: {
    id: string;
    email: string;
    blocked: boolean;
    roles: string[];
    permissions: string[];
  };
}

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      setError("Sesion expirada o no autorizada. Vuelve a iniciar sesion.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const canSubmit = email.trim().includes("@") && password.length >= 8 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient.post<LoginResponse>("/api/v1/auth/login", {
        email: email.trim(),
        password,
      });

      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/home");
    } catch (err) {
      if (err instanceof ApiError && err.body?.detail) {
        setError(err.body.detail);
      } else if (err instanceof Error) {
        const msg = err.message || "Error al iniciar sesion.";
        setError(msg.includes("fetch") || msg.includes("Network") ? "No se pudo conectar con el servidor. Revisa que VITE_API_URL apunte a la API y que CORS permita este origen." : msg);
      } else {
        setError("Error al iniciar sesion.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="bg-white border border-gray-200 rounded-sm p-6 mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-800">Iniciar sesion</h1>
          <p className="text-sm text-gray-600 mt-1">Accede con tus credenciales del sistema.</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-sm p-6 flex flex-col gap-4">
          {error && <div role="alert" className="border border-gray-200 rounded-sm p-3 text-sm text-gray-700">{error}</div>}

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Correo electronico</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@telecom.local"
              autoComplete="email"
              autoFocus
              className="border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-700">Contrasena</span>
            <div className="flex gap-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
                className="flex-1 border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#002D72]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="bg-white border border-gray-200 text-gray-800 px-4 py-2 text-sm rounded-sm hover:border-[#002D72]"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-[#002D72] text-white px-5 py-2 text-sm rounded-sm hover:bg-[#001F4D] disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <section className="bg-white border border-gray-200 rounded-sm p-6 mt-6">
          <h2 className="text-2xl font-semibold text-gray-800">Credenciales de prueba</h2>
          <p className="text-sm text-gray-600 mt-1">Usa estas cuentas para acceder al sistema en ambiente demo.</p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-700">
              Admin: <span className="text-gray-600">admin@telecom.local / Admin123!</span>
            </p>
            <p className="text-sm text-gray-700">
              Ventas: <span className="text-gray-600">ventas@telecom.local / Ventas123!</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
