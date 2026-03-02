import { Router } from "express";

export function healthRouter() {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "telecom-fieldops-api",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}