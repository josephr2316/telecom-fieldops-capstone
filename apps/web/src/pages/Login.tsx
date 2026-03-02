import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services/auth";

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = email.trim().includes("@") && password.length >= 8 && !loading;

  useEffect(() => {
    const session = authService.getSession();
    if (!session) {
      return;
    }

    if (authService.isInactive(INACTIVITY_LIMIT_MS)) {
      authService.clearSession();
      return;
    }

    navigate("/home", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      setError("Sesion expirada o no autorizada. Vuelve a iniciar sesion.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await authService.loginWithPassword(email, password);
      authService.setSession(session);
      authService.markActivity();
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        <header
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            padding: "1.5rem",
            marginBottom: "1.25rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, color: "#1f2937", fontSize: "1.6rem", fontWeight: 600 }}>Iniciar sesion</h1>
          <p style={{ margin: "0.4rem 0 0", color: "#4b5563", fontSize: "0.9rem" }}>
            Accede con tus credenciales del sistema.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {error ? (
            <div
              role="alert"
              style={{
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                padding: "0.75rem",
                borderRadius: 4,
                fontSize: "0.9rem",
              }}
            >
              <strong>No se pudo iniciar sesion.</strong>
              <div style={{ marginTop: 4 }}>{error}</div>
            </div>
          ) : null}

          <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#374151" }}>Correo electronico</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@dominio.com"
              autoComplete="email"
              autoFocus
              style={{
                border: "1px solid #d1d5db",
                padding: "0.6rem 0.7rem",
                fontSize: "0.9rem",
                color: "#1f2937",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#374151" }}>Contrasena</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                autoComplete="current-password"
                style={{
                  flex: 1,
                  border: "1px solid #d1d5db",
                  padding: "0.6rem 0.7rem",
                  fontSize: "0.9rem",
                  color: "#1f2937",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#1f2937",
                  padding: "0.6rem 0.9rem",
                  fontSize: "0.85rem",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: "#002D72",
              color: "#fff",
              border: 0,
              padding: "0.65rem 1rem",
              fontSize: "0.9rem",
              borderRadius: 4,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
