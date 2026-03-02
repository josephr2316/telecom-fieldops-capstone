# Prisma migrations

- **Aplicar migraciones:** desde `apps/api` → `npm run migrate`
- **Estado:** `npx prisma migrate status`
- **Crear una nueva migración:** ver sección **"Base de datos y migraciones"** → **"Crear una nueva migración"** en el [README del proyecto](../../../../README.md) (Opción A con shadow DB u Opción B manual).

## Producción (Railway u otro host)

Si la API en producción usa una base PostgreSQL distinta, **hay que aplicar las migraciones contra esa base**; si no, aparecerá el error **P2022** (`column work_orders.technician_notes does not exist`) en listados de órdenes y en el dashboard KPIs.

1. En el entorno de producción, con `DATABASE_URL` apuntando a la base real, ejecutar desde `apps/api`:
   ```bash
   npm run migrate
   ```
   o, como paso de release antes de arrancar la app:
   ```bash
   npm run release
   ```
2. En Railway: configurar el **Release Command** (o equivalente) como `npm run release` para que cada deploy aplique migraciones pendientes antes de iniciar el servidor.

### Comandos en Railway (resumen)

| Qué | Comando | Descripción |
|-----|---------|-------------|
| **Release Command** | `npm run release` | Se ejecuta **una vez** por deploy; aplica migraciones. **No** lo cambies por `npm run dev`. |
| **Start Command** | `npm start` | Arranca la API en producción (`node dist/main.js`). Es lo que mantiene el servidor en marcha. |
| Solo en local | `npm run dev` | Servidor de desarrollo con recarga; **no** usar en Railway. |

**No uses `npm run dev` en Railway.** En producción el servidor debe arrancar con `npm start`; las migraciones se aplican con el Release Command `npm run release`.

**Nota:** `npm run release` solo aplica el **esquema** (migraciones); no carga datos. Para cargar usuarios/roles/datos iniciales hay que ejecutar **seed** una vez: `npm run seed` (desde `apps/api`).

---

**Dashboard devuelve 401:** El rol `admin` tiene permiso `*` (incluye `kpis:read`). Un 401 significa que la petición no tiene usuario autenticado (token ausente o inválido). Comprobar que el frontend envía `Authorization: Bearer <token>` y que la URL base de la API en producción es la correcta.

**502 Bad Gateway:** Suele indicar que la API no respondió (caída, migraciones pendientes o crash al arrancar); revisar logs en Railway y que el **Release Command** ejecute `npm run release`.
