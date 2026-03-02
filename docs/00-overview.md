Proyecto: Telecom FieldOps Capstone

Objetivo
Construir un sistema minimo funcional para operaciones telecom con:
- backend Node.js + Express
- frontend React
- API First (OpenAPI)
- seguridad por codigo
- auditoria completa
- soporte offline con export/import JSON

Alcance funcional (resumen)
- autenticacion, usuarios y roles
- catalogo (planes y productos)
- inventario por sucursal con reserva/liberacion
- solicitudes (work orders) con maquina de estados y versionado
- dashboard administrativo con KPIs
- sincronizacion offline por import de operaciones

Matriz de trazabilidad rapida (rubrica -> evidencia)

1) Contexto de negocio
- docs: `docs/01-business-context.md`

2) RF, RNF, RB
- docs: `docs/02-rf.md`, `docs/03-rnf.md`, `docs/04-rb.md`

3) Edge cases
- docs: `docs/05-edge-cases.md`

4) Threat model mini
- docs: `docs/06-threat-model.md`

5) Auditoria (eventos y campos)
- docs: `docs/07-audit-events.md`
- codigo: `apps/api/src/domain/services/audit.service.ts`, `apps/api/src/infra/repositories/audit.repo.ts`

6) Logs estructurados y correlationId
- docs: `docs/08-loggin-observability.md`
- codigo: `apps/api/src/infra/logger/logger.ts`, `apps/api/src/middleware/correlationId.ts`

7) Seguridad por codigo
- docs: `docs/09-security-checklist.md`
- codigo:
  - auth/rbac: `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/rbac.ts`
  - rate limit: `apps/api/src/middleware/rateLimit.ts`
  - validacion: `apps/api/src/middleware/validate.ts`
  - anti-XSS: `apps/api/src/middleware/sanitize.ts`, `apps/web/src/services/sanitizer.ts`

8) KPIs con formula y fuente
- docs: `docs/10-kpi.md`
- codigo: `apps/api/src/domain/services/kpi.service.ts`

9) Maquina de estados + errores 409
- docs: `docs/11-state-machine.md`
- codigo: `apps/api/src/domain/stateMachine/workOrderStateMachine.ts`, `apps/api/src/domain/stateMachine/transitions.ts`

10) Diagramas
- secuencia: `docs/12-sequence-diagrams.md` (2 diagramas)
- ERD: `docs/14-erd-and-offline-guide.md`

11) ADRs tecnicos
- docs: `docs/13-adr/ADR-0001-tech-stack.md` a `docs/13-adr/ADR-0007-response-rules.md`

12) Offline-first + export/import + estructura LocalStorage
- docs: `docs/14-erd-and-offline-guide.md`
- codigo: `apps/web/src/utils/offlineQueue.ts`, `apps/api/src/routes/sync.routes.ts`, `apps/api/src/domain/services/sync.service.ts`

13) API First (OpenAPI actualizado, versionado, securitySchemes)
- contrato: `apps/api/src/openapi/openapi.yaml`
- validacion local: `scripts/validate-openapi.js`

14) Pruebas
- integracion: `apps/api/tests/auth-rbac.test.ts`, `apps/api/tests/sync-import.test.ts`, `apps/api/tests/kpi-dashboard.test.ts`
- unidad/auditoria: `apps/api/src/tests/unit/audit.test.ts`

15) Roles y evidencia para demo
- docs: `docs/15-permissions-and-roles.md`, `docs/16-verification-and-test-users.md`

Restricciones obligatorias (recordatorio)
- no usar assets externos por URL
- mantener OpenAPI actualizado en cada cambio
- auth + permisos por endpoint
- rate limiting en endpoints criticos
- sanitizacion anti-XSS
- auditoria + logs con correlationId
- soporte offline con LocalStorage + cache + export/import JSON
- justificar dependencias y revisar vulnerabilidades (`npm audit` o equivalente)
