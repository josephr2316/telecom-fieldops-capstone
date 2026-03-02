- Prisma: solo DATABASE_URL (quitar DIRECT_URL), pgbouncer y uselibpqcompat para Supabase pooler
- Evitar 'self-signed certificate in certificate chain' y prepared statements
- Swagger: servers por defecto /api/v1 (misma origen), opcional API_PUBLIC_URL
- Login/errorHandler: log con errorName y code para diagnóstico
- Startup: ping DB y log Database connection OK / fail
- README: sección Railway, variables y pgbouncer/SSL
- .env.example: una sola DATABASE_URL, nota SSL

Made-with: Cursor

## Objetivo del PR
- Corregir error 500 en login (local y Railway): conexión a Supabase pooler (prepared statements + certificado SSL), mejorar diagnóstico de errores y documentar despliegue.

## Tipo de cambio
- [ ] feat (nueva funcionalidad)
- [x] fix (bug)
- [x] docs
- [ ] test
- [ ] refactor
- [ ] chore (config/build)

## Referencia a documentación
- RF relacionados: —
- RNF relacionados: —
- RB relacionadas: —
- Edge cases impactados: Conexión a Supabase con pooler (puerto 6543) y SSL; despliegue en Railway.
- ADR (si aplica): —

## OpenAPI / API First
- [ ] Actualicé apps/api/src/openapi/openapi.yaml si este PR cambia endpoints, request/response o modelos
- [ ] El endpoint(s) implementado(s) están documentados con status codes correctos y ejemplos
- [x] Mantengo el versionado /api/v1 (no endpoints sin versión)

## Seguridad por código
- Input validation: [x] Validación existente (login con schema), 400 con ProblemDetails
- Auth/RBAC: [x] Login y rutas protegidas sin cambios; no se exponen secretos en logs
- Anti-DoS (rate limit): [x] Login ya tiene rate limit (5/60s), 429 al exceder
- XSS / sanitización: [x] No se toca renderizado de texto
- SQL/DB safety: [x] Solo Prisma client; se añaden parámetros de conexión (pgbouncer, uselibpqcompat), no queries
- File safety: N/A
- Dependencies: [x] No se agregaron librerías

## Errores, logs y auditoría
- Manejo de errores: [x] Respuestas siguen ProblemDetails; no se expone stack ni secretos al cliente (solo en dev detail/errorName)
- Logs: [x] correlationId en logs; se añade errorName y code para diagnóstico; no se loguean passwords/tokens
- Auditoría: [x] Sin cambios en eventos de auditoría (login ya registra audit)

## Offline / cache (si aplica)
- N/A

## Pruebas
- [ ] Agregué o actualicé tests
- [ ] Hay al menos 1 test por RF tocado
- [ ] Tests RB críticas / integración cuando corresponde  
*(Este PR es fix de infra/config y docs; se recomienda probar login manual en local y Railway.)*

## Migraciones/DB (si aplica)
- [x] No se cambió schema de datos; solo uso de DATABASE_URL en prisma.config y cliente
- [ ] No se generó nueva migración
- [ ] Seed sin cambios

## No assets externos
- [x] No se usan links/assets externos nuevos

## Cómo probar (pasos exactos)
1) Clonar/checkout rama `fix/login-db-ssl-env-and-docs`. En `apps/api`: copiar `.env.example` a `.env` y configurar `DATABASE_URL` (Supabase pooler, puerto 6543).
2) Ejecutar `npm run migrate` y `npm run seed` contra la base indicada en `DATABASE_URL`.
3) Arrancar API con `npm run dev`. En logs debe aparecer "Database connection OK". Abrir http://localhost:3000/api-docs y ejecutar POST /auth/login con `{"email":"admin@telecom.local","password":"Admin123!"}` → debe devolver 200 con accessToken.
4) En Railway: configurar variables (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET), redeploy, ejecutar migrate y seed en el mismo proyecto. Probar login contra la URL de producción.

## Capturas / evidencia (opcional pero recomendado)
- [ ] Adjuntar screenshot de login 200 en Swagger (local y/o Railway) si se tiene.

## Trade-offs y riesgos
- **Trade-offs:** Uso de `uselibpqcompat=true` y `pgbouncer=true` en la URL de conexión cuando se detecta pooler Supabase: menos verificación estricta de certificado SSL (cifrado sí, verificación CA no) para compatibilidad con certificados Supabase; simplificación a una sola `DATABASE_URL` (migrate y app usan la misma URL).
- **Riesgos:** Bajo: cambios son configuración de conexión, logging y documentación; no se modifican reglas de negocio ni contratos de API.
- **Mitigación:** Documentación en README (Railway, variables, pgbouncer/SSL); logs con errorName/code para diagnosticar fallos; en producción usar secretos JWT fijos y DATABASE_URL correcta.
