import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/auth";

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
const REFRESH_CHECK_INTERVAL_MS = 15 * 1000;
const REFRESH_BUFFER_MS = 60 * 1000;

export default function AuthSessionManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!authService.getSession()) {
      return;
    }

    if (!authService.getLastActivityAt()) {
      authService.markActivity();
    }

    const onActivity = () => {
      if (!authService.getSession()) {
        return;
      }
      authService.markActivity();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    for (const eventName of events) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, onActivity);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const session = authService.getSession();
      if (!session) {
        return;
      }

      if (authService.isInactive(INACTIVITY_LIMIT_MS)) {
        void authService.logout();
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
        }
        return;
      }

      if (!authService.shouldRefreshSession(REFRESH_BUFFER_MS) || refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;
      void authService
        .refreshSession()
        .catch(() => {
          void authService.logout();
          if (location.pathname !== "/") {
            navigate("/", { replace: true });
          }
        })
        .finally(() => {
          refreshingRef.current = false;
        });
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [location.pathname, navigate]);

  return null;
}
