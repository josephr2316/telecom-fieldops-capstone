# Verificación E2E y usuarios de prueba

## 1. Base de datos

- **Schema (Prisma):** Coherente con migraciones. Tablas: users, roles, revoked_refresh_tokens, audits, plans, products, branches, inventory, work_orders, reservations, audit_log.
- **Datos de seed:** `scripts/seed-data.json` con referencias válidas (branchId, planId, productId existentes). work_orders con `items` no vacíos; wo_03 tiene `items: [{ "productId": "prod_cable_fiber_10m", "qty": 1 }]`.
- **Backfill en seed:** El script rellena `technician_notes`, `checklist` e `items` vacíos en work_orders y normaliza `assigned_tech_user_id`, `customer_id`, `branch_id`, `plan_id` a IDs del seed. No quedan nulls/vacíos indebidos tras ejecutar el seed.
- **Para refrescar datos:** Desde `apps/api`: `RUN_SEED=force npm run seed`.

## 2. Backend (API)

- **Rutas montadas bajo `/api/v1`:** auth (login, refresh, logout), catalog (plans, products), inventory (branches, products, reservations), work-orders (CRUD, status, assign, tech-details), sync (import), kpis (dashboard/kpis, kpis/summary), users, roles, audit.
- **Validación:** Zod en body/params donde aplica; respuestas con ProblemDetails en errores.
- **Auth/RBAC:** Endpoints protegidos con Bearer JWT; permisos por ruta (requirePermissions / requireAnyPermission). Usuario bloqueado → 403.
- **Tests:** 13 tests de integración pasando (auth-rbac, sync-import, kpi-dashboard) tras ejecutar el seed.

## 3. Frontend

- **Variable de entorno:** `VITE_API_URL` (ej. `https://telecom-fieldops-capstone-production.up.railway.app` en prod o `http://localhost:3000` en local). La app usa esta URL para todas las llamadas al API.
- **Login:** Envía credenciales a `POST /api/v1/auth/login` y guarda token; lo envía en `Authorization: Bearer` en peticiones protegidas.
- **Offline (RF-10/11):** Cola en LocalStorage; export a JSON desde Mis órdenes.

## 4. Acceso por rol (resumen)

| Rol       | Permisos típicos                                      | Endpoints que puede usar (ejemplos)                    |
|----------|--------------------------------------------------------|--------------------------------------------------------|
| admin    | * (todos)                                             | Todos                                                  |
| tecnico  | workorders:view-own, workorders:update-state, sync:import | GET/PATCH work-orders (propias), tech-details, POST /sync/import |
| supervisor | workorders:*, inventory:view                        | Work-orders, inventario                                |
| ventas   | workorders:create, inventory:reserve                   | POST work-orders, POST reservations                   |
| security | audit:read, users:read, roles:read                    | GET audit, GET users, GET roles                        |

## 5. Usuarios y contraseñas para probar

Tras ejecutar el seed (con el `seed-data.json` actual), estos usuarios existen en la tabla `users` y permiten login en la app y en Swagger/Postman.

| Email                   | Contraseña     | Rol        | Uso recomendado |
|-------------------------|----------------|-----------|------------------|
| admin@telecom.local     | **Admin123!**  | admin     | Acceso total; usuarios, roles, auditoría, KPIs, sync/import. |
| tecnico@telecom.local   | **Tecnico123!**| tecnico   | Mis órdenes, checklist, notas, cambio de estado, export/import offline. |
| supervisor@telecom.local| **Supervisor123!** | supervisor | Work orders e inventario. |
| ventas@telecom.local    | **Ventas123!** | ventas    | Crear work orders, reservar inventario. |
| security@telecom.local  | **Security123!** | security  | Solo auditoría, listar usuarios y roles. |

- **Importante:** Estas contraseñas están en el seed solo para entornos de desarrollo/pruebas. En producción usar contraseñas fuertes y/o flujo de onboarding seguro.

## 6. Cómo probar

1. **Base de datos:** En `apps/api`: `npm run migrate` (si hay migraciones pendientes) y `RUN_SEED=force npm run seed`.
2. **Backend:** `npm run dev` en `apps/api`; comprobar `GET /api/v1/health` y login con cualquiera de la tabla anterior.
3. **Frontend:** En `apps/web` definir `VITE_API_URL` (ej. `http://localhost:3000`), `npm run dev`, abrir login e iniciar sesión con un usuario de la tabla.
4. **Endpoints:** Usar Swagger en `/api/v1` (si está montado) o Postman: `POST /api/v1/auth/login` con `email` y `password` de la tabla, luego usar el `accessToken` en `Authorization: Bearer <token>`.
