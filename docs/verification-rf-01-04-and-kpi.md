# Verificación RF-01 a RF-13

Este documento verifica que los requisitos funcionales 1 a 13 están implementados y alineados con el contrato OpenAPI.

**Contrato OpenAPI:** `apps/api/src/openapi/openapi.yaml`  
**Servidor base:** `/api/v1` (definido en `apps/api/src/infra/app.ts`)

---

## RF-01 Autenticación y emisión de token

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| POST /auth/login (email, password → JWT) | OK | `routes/auth.routes.ts`, `domain/services/auth.service.ts` | `/auth/login` (post), LoginRequest, LoginResponse |
| POST /auth/refresh (refresh token) | OK | auth.routes.ts | `/auth/refresh` (post) |
| POST /auth/logout | OK | auth.routes.ts | `/auth/logout` (post) |
| Middleware validar JWT (401 si inválido) | OK | `middleware/auth.ts` | security: BearerAuth global |

**Tests:** `tests/auth-rbac.test.ts` (login 200/401, token en headers).

---

## RF-02 Gestión de usuarios

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| GET /users (lista usuarios) | OK | `routes/users.routes.ts` | `/users` (get), UserPublic[] |
| POST /users (crear usuario) | OK | users.routes.ts | `/users` (post), CreateUserRequest |
| PATCH /users/:id (actualizar) | OK | users.routes.ts | `/users/{id}` (patch), UpdateUserRequest |
| POST /users/:id/block (bloquear) | OK | users.routes.ts | `/users/{id}/block` (post) |
| Usuario bloqueado → 403 (RB-06) | OK | auth + RBAC en rutas | 403 en respuestas |

**Tests:** auth-rbac.test.ts (GET /users, block, 403 para usuario bloqueado).

---

## RF-03 Gestión de roles y permisos

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| GET /roles (lista roles y permissionKeys) | OK | `routes/roles.route.ts` | `/roles` (get), Role[] |
| RBAC por permiso (403 si no tiene permiso) | OK | `middleware/rbac.ts`, requirePermissions() | 403 en respuestas |

**Tests:** auth-rbac.test.ts (roles, permisos, 403 sin permiso).

---

## RF-04 Catálogo de planes

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| GET /catalog/plans (listar planes) | OK | `routes/plans.routes.ts` montado en /catalog | `/catalog/plans` (get) |
| GET /catalog/plans/:id | OK | plans.routes.ts | `/catalog/plans/{id}` (get) |
| POST/PATCH/DELETE planes, activate/deactivate | OK | plans.routes.ts | paths y schemas en openapi.yaml |

**Contrato:** Plan, CreatePlanRequest, UpdatePlanRequest en components/schemas.

---

## RF-05 Catálogo de productos

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| GET/POST/PATCH/DELETE /catalog/products | OK | `routes/products.routes.ts` | `/catalog/products`, `/catalog/products/{id}` |

---

## RF-06 Inventario por sucursal

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| GET /inventory?branchId=, /inventory/branches, /inventory/products | OK | `routes/inventory.routes.ts` | `/inventory`, `/inventory/branches`, `/inventory/products` |

---

## RF-07 Reservar y liberar inventario

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| POST /inventory/reservations (workOrderId, branchId, items) | OK | inventory.routes.ts, inventoryService.reserveForRequest | POST `/inventory/reservations` (RF-07) |
| DELETE /inventory/reservations/:workOrderId | OK | inventoryService.releaseForRequest | DELETE `/inventory/reservations/{workOrderId}` (RF-07) |

---

## RF-08 y RF-09 Work orders

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| POST /work-orders (crear por tipo) | OK | `routes/workorders.routes.ts`, workOrderService.createWorkOrder | POST `/work-orders` |
| PATCH /work-orders/:id/status (state machine) | OK | workOrderService.updateStatus, stateMachine | PATCH `/work-orders/{id}/status` |

---

## RF-10, RF-11, RF-12 Offline y sync

| RF | Estado | Notas |
|----|--------|-------|
| RF-10 (módulo técnico offline) | Soporte API OK | GET work-orders y PATCH status permiten al cliente trabajar; la parte offline (LocalStorage, checklist) es frontend (ADR-0002). |
| RF-11 (exportar a JSON) | N/A API | El cliente exporta desde su cola offline; no hay endpoint de export en la API. |
| RF-12 (importar desde JSON) | OK | POST /api/v1/sync/import implementado en `routes/sync.routes.ts`, `domain/services/sync.service.ts`; montado en /sync; permiso sync:import; OpenAPI SyncImportRequest/Response. |

---

## RF-13 Dashboard KPIs

| Requisito | Estado | Implementación | OpenAPI |
|-----------|--------|----------------|---------|
| GET /dashboard/kpis (mín. 8 KPIs) | OK | `routes/kpi.routes.ts`, `domain/services/kpi.service.ts` | `/dashboard/kpis` (get), operationId getDashboardKpis |
| GET /kpis/summary (alias) | OK | kpi.routes.ts | `/kpis/summary` (get), operationId getKpisSummary |
| Fórmulas y fuente de datos por KPI | OK | kpi.service.ts devuelve `formula`, `source`, `validationRules` | description y schema con source, validationRules |
| Respetar RB / no contar inválidos (RB-06) | OK | isValidForKpi excluye bloqueados y estados inválidos | validationRules en response |

**KPIs implementados (docs/10-kpi.md):** KPI-01 a KPI-10 (solicitudes hoy, completadas hoy, tasa cancelación, ciclo por tipo, backlog, inventario crítico, top 5 reservados, reclamos por categoría, resolución reclamos, instalaciones fallidas).

**Tests:** `tests/kpi-dashboard.test.ts` (200 con kpis/cards, 403 sin kpis:read).

---

## Contrato OpenAPI – comprobación

- **Rutas montadas en app:** `buildApiRouter()` en `infra/routes/index.ts` monta health, /auth, /catalog (plans + products), inventory, work-orders, kpiRouter(), **syncRouter()** (/sync), /users, /roles, /audit. Prefijo global `/api/v1` en `infra/app.ts`.
- **Paths en openapi.yaml:** Coinciden con las rutas implementadas (auth, users, roles, catalog/plans, catalog/products, inventory, **inventory/reservations** POST/DELETE, work-orders, **sync/import**, dashboard/kpis, kpis/summary, audit).
- **Seguridad:** BearerAuth global; login/refresh/logout con `security: []`.
- **Schemas:** ProblemDetails, UserPublic, Role, LoginRequest/LoginResponse, Plan, etc. definidos en components/schemas.
- **Respuestas de error:** 400, 401, 403, 404, 409, 429 referenciados en components/responses.

Para validar el YAML (opcional): `npx @redocly/cli lint openapi.yaml` o cargar en Swagger UI (`/api-docs`).

---

## Cómo ejecutar verificación

```bash
cd apps/api
npm run build   # compila sin errores
npm test        # tests de integración (auth-rbac, kpi-dashboard)
```

Última verificación: build OK, 10 tests pasando (auth-rbac + kpi-dashboard).
