# RF-01, RF-02, RF-03 – Alcance, endpoints y tests

**Contrato OpenAPI:** `apps/api/src/openapi/openapi.yaml`

---

## Estructura del programa (dónde va cada cosa)

Ruta base del backend: `apps/api/src/`. Todo el código del API se organiza así para que el equipo sepa dónde incluir cada parte de RF-01, RF-02 y RF-03.

```
apps/api/src/
├── main.ts                    # Punto de entrada; solo importa infra/app y hace listen.
├── openapi/
│   └── openapi.yaml           # Contrato API (mantener actualizado con cada endpoint).
├── domain/
│   └── models/
│       └── types.ts           # Interfaces/tipos de dominio: User, Role, ProblemDetails, etc.
├── infra/
│   ├── app.ts                 # Configuración Express (json, CORS, montaje de rutas y middlewares).
│   └── routes/
│       ├── index.ts           # Agrupa y monta todos los routers (health, auth, users, roles).
│       ├── health.ts          # GET /health (RF: —).
│       ├── auth.ts            # RF-01: POST /auth/login, POST /auth/logout (opcional).
│       ├── users.ts           # RF-02: GET /users, POST /users/:userId/block; opcional POST/PATCH /users.
│       └── roles.ts           # RF-03: GET /roles; opcional POST/PATCH /roles; asignación roles a usuarios.
│       └── audit.ts           # RF‑14: GET endpoints de consulta de eventos de auditoría.
└── middleware/
    ├── correlationId.ts       # Añade correlationId a cada request (logs/auditoría).
    ├── errorHandler.ts        # Manejo global de errores (ProblemDetails).
    ├── auth.ts                # RF-01: valida JWT, adjunta usuario al request; 401 si no hay token o es inválido.
    └── rbac.ts                # RF-03: comprueba que el usuario tenga el permiso requerido por la ruta; 403 si no.
```

### Mapa rápido: RF → archivos

| RF    | Dónde implementar |
|-------|-------------------|
| RF-01 | `infra/routes/auth.ts` (login, logout), `middleware/auth.ts` (validar JWT). Lógica de usuarios/contraseñas y emisión de token puede estar en un servicio bajo `domain/` o `infra/` según convenio del equipo. |
| RF-02 | `infra/routes/users.ts` (GET /users, POST /users/:userId/block, y opcional crear/editar). Modelo `User` en `domain/models/types.ts`. Middleware auth y RBAC ya aplican 401/403 (usuario bloqueado → 403, RB-06). |
| RF-03 | `infra/routes/roles.ts` (GET /roles, y opcional CRUD roles / asignar roles a usuario). Modelo `Role` en `domain/models/types.ts`. `middleware/rbac.ts` usa `permissionKeys` del rol del usuario para autorizar o devolver 403. |

En `infra/routes/index.ts` se montan los routers, por ejemplo: `router.use(healthRouter)`, `router.use('/auth', authRouter)`, `router.use('/users', usersRouter)`, `router.use('/roles', rolesRouter)`, de modo que las rutas queden bajo `/api/v1` (definido en `infra/app.ts`).

---

## Paso a paso: qué hacer (Backend, CORS, Frontend, Tests)

### 1. Backend (API)
1. Implementar **RF-01**: POST /auth/login (JWT con expiración); opcional POST /auth/logout.
2. Implementar **RF-02**: GET /users, POST /users/:userId/block; opcional POST /users y PATCH /users/:id.
3. Implementar **RF-03**: GET /roles; forma de asignar roles a usuarios (roleIds en User o endpoint dedicado); middleware RBAC que use permissionKeys por ruta.
4. Proteger rutas con auth (Bearer) y RBAC; usuario bloqueado → 403 (RB-06).
5. Mantener OpenAPI actualizado con los paths y schemas que se implementen.

### 2. CORS
1. **Backend**: Configurar CORS en la app Express (orígenes permitidos, métodos, cabeceras). Permitir el origen del frontend (URL de Vercel/Netlify o `http://localhost:XXXX` en desarrollo).
2. **Frontend**: Usar la URL base del API (variable de entorno) para todas las peticiones; no hace falta configurar CORS en el frontend, solo consumir el API.

### 3. Frontend
1. Pantalla de login que llame a POST /auth/login y guarde `accessToken` y `expiresAt` (ej. en estado o almacenamiento seguro).
2. Enviar el token en `Authorization: Bearer <token>` en todas las peticiones a endpoints protegidos.
3. Si hay logout, llamar a POST /auth/logout y limpiar token/sesión.
4. Vistas que consuman GET /users, GET /roles (y las que correspondan), según permisos del usuario.

### 4. Tests
1. **Backend (apps/api)**: Mínimo 1 test por RF (RNF-TEST-01): tests de integración que llamen a los endpoints y comprueben códigos y cuerpos (login 200/401, users, roles, block, RBAC 403).
2. Ejecutar tests en CI (ej. GitHub Actions) si está configurado.
3. Los criterios detallados por RF están en las secciones siguientes.
---

## Referencia rápida RF-04 a RF-12

| RF | Descripción | Endpoints | Archivos principales |
|----|-------------|-----------|---------------------|
| RF-02 | Gestión de usuarios | GET/POST/PATCH /users, block/unblock | `routes/users.ts`, `services/user.service.ts`, `tests/integration/user-management.test.ts`| 
| RF-04 | Catálogo de planes | GET/POST/PATCH/DELETE /catalog/plans, activate, deactivate | `routes/plans.routes.ts`, `domain/services/plans.service.ts` | 
| RF-05 | Catálogo de productos | GET/POST/PATCH/DELETE /catalog/products | `routes/products.routes.ts`, `domain/services/products.service.ts` |
| RF-06 | Inventario por sucursal | GET /inventory?branchId=, GET /inventory/branches, GET /inventory/products | `routes/inventory.routes.ts`, `domain/services/invetory.service.ts` |
| RF-07 | Reservar y liberar inventario | POST /inventory/reservations, DELETE /inventory/reservations/:workOrderId | `routes/inventory.routes.ts`, `domain/services/invetory.service.ts` |
| RF-08 | Crear work order por tipo | POST /work-orders (type, customerId, branchId, planId, items) | `routes/workorders.routes.ts`, `domain/services/workorder.service.ts` |
| RF-09 | Cambiar estado (state machine) | PATCH /work-orders/:id/status (newStatus, baseVersion) | `routes/workorders.routes.ts`, `domain/services/workorder.service.ts`, `domain/stateMachine/workOrderStateMachine.ts` |
| RF-10 | Módulo técnico offline | Soporte API: GET /work-orders, PATCH /work-orders/:id/status. La parte offline (guardar en dispositivo, checklist) es frontend (ADR-0002). | — |
| RF-11 | Exportar offline a JSON | El cliente exporta desde su cola offline (LocalStorage). No hay endpoint de export en la API. | `docs/13-adr/ADR-0002-storage-offline-sync.md` |
| RF-12 | Importar offline desde JSON | POST /api/v1/sync/import (meta + operations). Requiere permiso sync:import. | `routes/sync.routes.ts`, `domain/services/sync.service.ts`, montaje en `infra/routes/index.ts` bajo /sync |

Contrato OpenAPI: todos los paths anteriores están definidos en `apps/api/src/openapi/openapi.yaml`.

---

## RF-13 Dashboard KPIs (referencia rapida)

- Endpoint: `GET /api/v1/dashboard/kpis`
- Alias: `GET /api/v1/kpis/summary`
- Router: `apps/api/src/routes/kpi.routes.ts`
- Servicio: `apps/api/src/domain/services/kpi.service.ts`
- Montaje: `apps/api/src/infra/routes/index.ts`
- Contrato: `apps/api/src/openapi/openapi.yaml`
- Documentacion funcional: `docs/10-kpi.md`
- Test de integracion: `apps/api/tests/kpi-dashboard.test.ts`
