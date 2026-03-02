# Tests del API

Hay **una sola carpeta de tests**: `apps/api/tests/`.

- **unit/** – Tests que no usan HTTP ni BD (p. ej. middleware `writeAudit`).
- **integration/** – Tests que levantan la app y usan la BD (auth, kpi, sync, user-management).

El orden de ejecución lo define `jest/testSequencer.js` (debe ser `.js` porque Jest lo carga con `require()` antes de ts-jest). Tras los tests, el suite de user-management **restaura** los usuarios y roles del seed en `afterAll`, para que puedas usar el frontend (login con admin@telecom.local / Admin123!) después de ejecutar `npm test`.

Para ejecutar: desde `apps/api`, `npm test`. Opcional: ejecutar antes `RUN_SEED=force npx prisma db seed` si la BD está vacía.
