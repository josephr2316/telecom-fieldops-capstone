import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/auth";

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

type RequireAuthProps = {
  children: ReactElement;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const session = authService.getSession();
  if (!session || authService.isInactive(INACTIVITY_LIMIT_MS)) {
    authService.clearSession();
    return <Navigate to="/" replace />;
  }

  return children;
}
