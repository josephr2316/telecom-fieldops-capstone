# Documentacion final del proyecto

## 1. Resumen ejecutivo

**Telecom FieldOps Capstone** es una plataforma para operaciones de una empresa de telecomunicaciones con:
- gestion de solicitudes end-to-end (instalacion, reclamacion, venta, pago)
- inventario por sucursal con reserva/liberacion
- control de estados con maquina de estados y validaciones de negocio
- seguridad por codigo (auth, RBAC, rate limit, validacion, sanitizacion)
- auditoria y logs estructurados con `correlationId`
- modulo tecnico offline-first con cola local y export/import JSON
- dashboard administrativo con KPIs

---

## 2. Stack y arquitectura

### Backend
- Node.js + Express + TypeScript
- Prisma + PostgreSQL (Supabase compatible)
- OpenAPI 3.1 (`apps/api/src/openapi/openapi.yaml`)
- Zod para validacion
- JWT para autenticacion

### Frontend
- React + TypeScript + Vite
- React Router
- LocalStorage para cache y cola offline

### Arquitectura por capas (API)
- `routes/`: contratos HTTP por recurso
- `middleware/`: auth, rbac, correlationId, rate limit, manejo de errores, sanitize
- `domain/services/`: reglas de negocio
- `infra/repositories/`: persistencia con Prisma

---

## 3. Modulos funcionales implementados

- **Auth/RBAC**: login, refresh, logout, permisos por endpoint, bloqueo de usuarios.
- **Usuarios y roles**: listar, crear, editar, bloquear, asignacion de roles.
- **Catalogo**: CRUD de planes y productos.
- **Inventario**: inventario por sucursal, reservas atomicas, liberacion.
- **Work Orders**: creacion, asignacion, cambio de estado, notas/checklist tecnico.
- **Sync offline**: import de operaciones con `baseVersion` y manejo de conflictos.
- **KPIs**: endpoint de dashboard con KPI-01 a KPI-10.
- **Auditoria**: consulta de eventos por filtros, entidad y usuario.

---

## 4. Requisitos no funcionales cubiertos

- API First con OpenAPI y versionado `/api/v1`.
- Manejo consistente de errores en formato ProblemDetails.
- Trazabilidad con `X-Correlation-Id` en request/response.
- Logs estructurados.
- Sanitizacion anti-XSS de campos string (backend y utilitario frontend).
- Rate limiting por codigo en endpoints criticos.
- Soporte offline con LocalStorage y export/import JSON.

---

## 5. Estructura principal del repositorio

```text
telecom-fieldops-capstone/
  apps/
    api/   # Backend Express + Prisma
    web/   # Frontend React + Vite
  docs/    # Documentacion funcional, tecnica y de entrega
  scripts/ # Utilidades (ej. validacion OpenAPI)
```

---

## 6. Como correr el proyecto (local)

## 6.1 Prerrequisitos

- Node.js `>= 20.20.0`
- npm
- acceso a una BD PostgreSQL (ej. Supabase)

## 6.2 Configurar y correr backend (API)

1. Ir a la carpeta API:

```bash
cd apps/api
```

2. Crear archivo de entorno:

```bash
cp .env.example .env
```

PowerShell equivalente:

```powershell
Copy-Item .env.example .env
```

3. Editar `.env` con tus valores reales:
- `DATABASE_URL`
- `DIRECT_URL` # Direct connection to main DB (capstone) for Prisma migrate. Must be capstone so migrations apply where the app runs.

4. Instalar dependencias:

```bash
npm install
```

5. Ejecutar migraciones:

```bash
npm run migrate
```

6. Cargar seed:

```bash
npx prisma db seed
```

7. Iniciar API en desarrollo:

```bash
npm run dev
```

8. Verificacion rapida:
- health: `GET http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/api-docs`

## 6.3 Configurar y correr frontend (Web)

1. Ir a la carpeta web:

```bash
cd apps/web
```

2. Crear `.env` (o usar `.env.local`) con:

```bash
VITE_API_URL=http://localhost:3000
```

3. Instalar dependencias:

```bash
npm install
```

4. Iniciar frontend:

```bash
npm run dev
```

5. Abrir app en navegador (Vite mostrara URL local, comunmente `http://localhost:5173`).

---

## 7. Usuarios de prueba para demo

Despues del seed, usar:

- `admin@telecom.local` / `Admin123!`
- `tecnico@telecom.local` / `Tecnico123!`
- `supervisor@telecom.local` / `Supervisor123!`
- `ventas@telecom.local` / `Ventas123!`
- `security@telecom.local` / `Security123!`

---

## 8. Pruebas y validaciones

## 8.1 Backend

```bash
cd apps/api
npm test
```

Incluye pruebas de integracion para auth/rbac, sync import y KPIs.

## 8.2 Frontend

```bash
cd apps/web
npm test
```

## 8.3 Validacion OpenAPI

```bash
cd apps/api
npm run openapi:validate
```

---

## 9. Flujo recomendado para demo funcional

1. Login como `ventas`.
2. Crear `work-order`.
3. Cambiar estado a `INVENTORY_RESERVATION`.
4. Verificar reserva de inventario.
5. Login como `tecnico`, abrir Mis Ordenes y completar checklist/notas.
6. Simular offline: guardar cambios en cola local y exportar JSON.
7. Importar/sincronizar operaciones y mostrar conflictos por `baseVersion` (si aplica).
8. Login como `admin` o `security` y revisar auditoria.
9. Mostrar dashboard de KPIs.

---

## 10. Deploy (referencia)

- Frontend: Vercel (o equivalente)
- Backend: Railway (o equivalente)

URLs actuales documentadas en `README.md`.

---

## 11. Troubleshooting rapido

- **401 en endpoints protegidos**: validar token Bearer y expiracion.
- **403 Forbidden**: revisar permisos del rol (RBAC) o si el usuario esta bloqueado.
- **409 Conflict en status**: transicion invalida o `baseVersion` desactualizada.
- **409 stock_insufficient**: inventario insuficiente para reserva.
- **Error de DB al iniciar**: revisar `DATABASE_URL` y conectividad.
- **Swagger no abre endpoints**: confirmar API activa y `/api-docs`.

---

## 12. Documentos complementarios

- contexto, RF/RNF/RB y edge cases: `docs/01` a `docs/05`
- threat model, seguridad, auditoria, observabilidad: `docs/06` a `docs/09`
- KPIs y maquina de estados: `docs/10` y `docs/11`
- secuencias, ADRs y ERD/offline: `docs/12`, `docs/13-adr`, `docs/14`
- roles/permisos y verificacion final: `docs/15`, `docs/16`

---

## 13. Flujo de colaboracion (GitHub)

- trabajar en `feature branches` por integrante
- abrir Pull Request por cada cambio relevante
- cada PR debe referenciar RF/RB impactados
- incluir pruebas del cambio
- actualizar OpenAPI y docs si el contrato o comportamiento cambia
- usar plantilla de referencia: `docs/PR_TEMPLATE_fill.md`

Meta recomendada para evaluacion individual:
- minimo 2 PRs aprobados por integrante

---

## 14. Estado de hosting

- frontend publicado en Vercel
- backend publicado en Railway
- ambas URLs estan en `README.md`