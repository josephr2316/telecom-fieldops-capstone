# telecom-fieldops-capstone
This project is for student use

Proyecto: Telecom FieldOps Suite

URL Web: https://telecom-fieldops-capstone.vercel.app/
URL API: https://telecom-fieldops-capstone-production.up.railway.app/
- Health en producción: https://telecom-fieldops-capstone-production.up.railway.app/api/v1/health

**Contrato OpenAPI (especificación):** `apps/api/src/openapi/openapi.yaml`

**Swagger UI (probar endpoints en el navegador):**
- Local: con la API en marcha, abre **http://localhost:3000/api-docs**
- Producción: **https://telecom-fieldops-capstone-production.up.railway.app/api-docs**

En Swagger UI puedes ejecutar todos los endpoints (login, catalog, inventory, etc.). El spec se carga desde `openapi.yaml`; la ruta `/api-docs` no está definida dentro del YAML, es una ruta de la app que sirve la interfaz.

## Variables de entorno

El archivo `.env` **no está en el repo** (está en `.gitignore` para no subir secretos ni config local). Para desarrollo local hay que **crearlo**:

1. En `apps/api`, copiar la plantilla: `cp .env.example .env`
2. Editar `.env` si quieres cambiar valores (por defecto vale para local).
3. **No subir `.env` a Git.** En producción (Railway) las variables se configuran en el panel del servicio.

## Cómo ejecutar local

**Backend API**
```bash
cd apps/api
cp .env.example .env   
npm install
npm run build
npm start
```
- Servidor en `http://localhost:3000` (o el valor de `PORT` si está definido).
- Health check: `GET http://localhost:3000/api/v1/health` → 200, cuerpo `ok`.
- **CORS**: En local funcionan `http://localhost:5173` y `http://localhost:3000`. En producción (Railway) definir `FRONTEND_URL` y `API_PUBLIC_URL` (sin barra final) para el front y la URL del API (Swagger).

**Si CORS da problemas** (ej. error de módulo `cors` o tipos): asegúrate de instalar dependencias dentro de `apps/api`:
```bash
cd apps/api
npm install
```
Eso instala `cors`, `dotenv`, `@types/cors` y el resto. Si algo falla, reinstalar (en Git Bash o WSL: `rm -rf node_modules package-lock.json`; en PowerShell: `Remove-Item -Recurse -Force node_modules; Remove-Item package-lock.json`; luego `npm install`).

**Desarrollo con recarga**
```bash
cd apps/api
npm run dev
```

### Probar la API con Swagger UI

1. Arranca la API (`npm run dev` o `npm start` desde `apps/api`).
2. Abre en el navegador: **http://localhost:3000/api-docs**
3. En la interfaz:
   - **POST /auth/login**: body `{"email":"admin@telecom.local","password":"Admin123!"}` → obtienes `accessToken`.
   - Para rutas protegidas: clic en **Authorize**, pega `Bearer <accessToken>` y confirma.
   - Prueba el resto de endpoints (GET /catalog/plans, etc.).

En producción la URL es: **https://telecom-fieldops-capstone-production.up.railway.app/api-docs**

Por defecto Swagger usa la misma origen (`/api/v1`), así que "Try it out" llama al mismo host (local o Railway) y no a localhost. Opcional: en Railway puedes definir **`API_PUBLIC_URL`** = `https://telecom-fieldops-capstone-production.up.railway.app` si quieres una URL absoluta en el spec.

### Despliegue en Railway (evitar "Login request failed" / "Unhandled error")

En el proyecto de Railway configura estas **variables de entorno**:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| **DATABASE_URL** | Sí | URL de PostgreSQL. **Supabase (pooler):** URI del "Transaction pooler" (puerto 6543) con `?pgbouncer=true&sslmode=require&uselibpqcompat=true` (ver `apps/api/.env.example`). Sin ellos, login da 500. |
| **JWT_ACCESS_SECRET** | Sí | Secreto para access tokens (ej: una frase larga o `openssl rand -hex 32`) |
| **JWT_REFRESH_SECRET** | Sí | Secreto para refresh tokens (diferente al anterior) |
| JWT_ISSUER | No | Por defecto `telecom-fieldops-api` |
| JWT_AUDIENCE | No | Por defecto `telecom-fieldops-clients` |
| NODE_ENV | No | `production` en Railway |

**Primera vez (o si la base está vacía):** después del deploy, ejecuta en Railway (o desde tu máquina con la misma `DATABASE_URL`) desde `apps/api`:

```bash
npm run migrate
npm run seed
```

Si no ejecutas migrate, las tablas no existen y el login devuelve 500. Si no ejecutas seed, no habrá usuario `admin@telecom.local` (401 en vez de 500). **Error 500 con Supabase pooler (6543):** la URL debe incluir `pgbouncer=true` y `uselibpqcompat=true` (ver `apps/api/.env.example`).

En los logs de Railway deberías ver "Database connection OK" al arrancar; si ves "Database ping failed at startup", revisa `DATABASE_URL`. Si el login sigue fallando, en el log aparecerá el mensaje de error real (error, errorName, code) para diagnosticar.

### Conectar el frontend al backend en Railway

El frontend está preparado para usar la API en Railway. Solo hace falta definir la **variable de entorno**:

| Variable | Uso |
|----------|-----|
| **VITE_API_URL** | URL base de la API (sin barra final). Ejemplo: `https://telecom-fieldops-capstone-production.up.railway.app` |

- **Local:** crea o edita `apps/web/.env` y pon `VITE_API_URL=https://telecom-fieldops-capstone-production.up.railway.app` (o la URL de tu API en Railway).
- **Despliegue (Vercel, Netlify, etc.):** añade la misma variable en el panel del proyecto. Así el build del frontend incluirá la URL correcta y las peticiones irán al backend en Railway.

Si no defines `VITE_API_URL`, el frontend usa por defecto `http://localhost:3000` (API local). Ver `apps/web/.env.example`.

## Base de datos y Prisma (Supabase)

La API usa **Prisma** con PostgreSQL (Supabase). La base de datos se llama **capstone**.

### Qué es qué

| Elemento | Función |
|----------|--------|
| **`prisma/schema.prisma`** | Define los modelos (tablas, columnas, relaciones). No crea nada en la base por sí solo. |
| **`prisma/migrations/`** | Archivos `.sql` que **sí crean o modifican** tablas, índices y restricciones en la base. Se aplican en orden con `npm run migrate`. |
| **`npx prisma generate`** | Genera el **cliente TypeScript** (PrismaClient) en `src/generated/prisma` a partir del schema. **No crea tablas ni ejecuta SQL** en la base; solo actualiza el código para usar los modelos en la app. |
| **Triggers, funciones, vistas** | Prisma no los genera desde el schema. Se añaden en un `migration.sql` a mano (CREATE FUNCTION, CREATE TRIGGER, etc.) y se aplican con `npm run migrate`. |

El proyecto ya tiene el schema y la migración inicial que crea todas las tablas. No hace falta `prisma init`.

---

### Primera vez: crear las tablas y dejar Prisma listo

1. **Variables de entorno**  
   Copia `apps/api/.env.example` a `apps/api/.env` y rellena con tu proyecto Supabase:
   - **`DATABASE_URL`**: conexión a la base **capstone**. Si usas Supabase transaction pooler (puerto 6543), incluye `?pgbouncer=true&sslmode=require&uselibpqcompat=true`; si usas conexión directa (5432), `?sslmode=require&uselibpqcompat=true` (ver `apps/api/.env.example`).
   Opcional: **`SHADOW_DATABASE_URL`** para `prisma migrate dev`; la app y `npm run migrate` usan solo **capstone** vía `DATABASE_URL`.
   El `.env` no se sube al repositorio (está en `.gitignore`).

2. **Aplicar migraciones (crear las tablas por primera vez)**  
   Desde `apps/api`:
   ```bash
   npm run migrate
   ```
   Ejecuta el SQL de `prisma/migrations/` contra la base **capstone** usando `DATABASE_URL`. Las tablas (roles, users, plans, products, branches, inventory, etc.) se crean aquí.

3. **Generar el cliente Prisma**  
   Desde `apps/api`:
   ```bash
   npx prisma generate
   ```
   Genera o actualiza el cliente en `src/generated/prisma` para usar `PrismaClient` en el código. No modifica la base de datos.

**Resumen primera vez:** `.env` → `npm run migrate` (crea tablas) → `npx prisma generate` (genera cliente).

---

### Comandos de uso habitual

| Comando | Descripción |
|--------|-------------|
| `npm run migrate` | Aplica todas las migraciones pendientes (crea o altera tablas). |
| `npx prisma migrate status` | Indica si hay migraciones pendientes y si el esquema está al día. |
| `npx prisma generate` | Regenera el cliente Prisma tras cambiar `schema.prisma`. |

---

### Crear una nueva migración (tablas, columnas, triggers)

**Con shadow database** (tienes `SHADOW_DATABASE_URL` en `.env`):  
1. Edita `prisma/schema.prisma`.  
2. Ejecuta: `npx prisma migrate dev --name nombre_corto` (ej. `add_plan_featured`).  
Prisma crea la carpeta en `prisma/migrations/` con el `migration.sql` y lo aplica.

**Sin shadow (manual):**  
1. Edita `prisma/schema.prisma` si cambias modelos.  
2. Ejecuta `npm run migrate:diff` y copia el SQL que necesites.  
3. Crea `prisma/migrations/YYYYMMDDHHMMSS_nombre/migration.sql` y pega el SQL (solo CREATE/ALTER que quieras; omite DROP si no aplica).  
4. Para **triggers o funciones**, escribe el SQL a mano en ese `migration.sql` (CREATE FUNCTION, CREATE TRIGGER, etc.).  
5. Ejecuta `npm run migrate` y luego `npx prisma generate` si cambiaste el schema.

---

### Estado de la conexión

- **Listo:** `.env` con `DATABASE_URL` apuntando a la base **capstone** (con los params indicados en `.env.example`), migraciones aplicadas, `npx prisma generate` ejecutado. Las tablas existen en capstone; la API usa Prisma (repos en `src/infra/repositories/`) contra esa base.

## Cómo correr tests
(pendiente)

## Arquitectura

**Backend (apps/api)**
- **main.ts**: punto de entrada; solo importa la app desde infra y ejecuta `listen`.
- **infra/app.ts**: configura Express (CORS, `express.json()`), monta las rutas bajo el prefijo `/api/v1`.
- **infra/routes/**: definición de endpoints por recurso.
  - **index.ts**: agrupa los routers (p. ej. health).
  - **health.ts**: `GET /health` (sin autenticación, según OpenAPI).
- Contrato API: `apps/api/src/openapi/openapi.yaml` (OpenAPI 3.1).

Decisiones (ADRs): `docs/13-adr/`
Seguridad implementada: (pendiente auth, rate limit, sanitización)
Auditoría: (pendiente)
Offline (LocalStorage + export/import): (pendiente)
KPIs: (pendiente)
Mapa Endpoint -> RF: (pendiente)
Cómo hacer un PR: usar la plantilla en `.github/PULL_REQUEST_TMP.md` y rellenar objetivo, RF/RB, cambios, cómo probar..