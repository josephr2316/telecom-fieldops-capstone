# RF-04 — Catálogo de Planes (TypeScript + Tailwind)

## Archivos entregados

| Archivo | Propósito |
| --- | --- |
| `src/types/plans.ts` | Interfaces y tipos compartidos (`Plan`, `ApiError`, `ProblemDetails`, etc.) |
| `src/services/plansService.ts` | Capa de datos: fetch, cache TTL 30 min, sanitización XSS |
| `src/hooks/usePlans.ts` | Estado tipado, loading, error, toggle optimista |
| `src/components/PlansPage.tsx` | Página principal — 100% Tailwind, sin CSS externo |
| `src/components/PlanCard.tsx` | Tarjeta individual — 100% Tailwind, sin CSS externo |
| `src/plans.test.ts` | 10 tests tipados (RNF-TEST-01) |
| `docs/plans.openapi.yaml` | Fragmento OpenAPI para merge en spec principal |

> ✅ **Sin CSS externo.** Todo el estilo en clases Tailwind dentro de los `.tsx`.
> ✅ **TypeScript estricto.** Tipos explícitos en props, estado, servicios y tests.

## Cómo integrar

### 1. Requisitos previos

```bash
# TypeScript ya configurado en el proyecto (tsconfig.json)
# Tailwind v3+ con content apuntando a src/**/*.{ts,tsx}
```

### 2. Variable de entorno

```env
VITE_API_URL=http://localhost:3000
```

### 3. Copiar estructura

```text
src/
  types/plans.ts
  services/plansService.ts
  hooks/usePlans.ts
  components/PlansPage.tsx
  components/PlanCard.tsx
src/plans.test.ts
docs/plans.openapi.yaml
```

### 4. Importar en el router

```tsx
import { PlansPage } from './components/PlansPage';

<Route path="/plans" element={<PlansPage />} />
```

### 5. Correr tests

```bash
npx vitest run src/plans.test.ts
```

---

## Checklist del PR

- [x] RF-04, RNF-PERF-01, RNF-SEC-02, RNF-SEC-03, RNF-TEST-01, RB-06, RB-07
- [x] EC-05, EC-06, EC-08 cubiertos
- [x] OpenAPI actualizado
- [x] TypeScript estricto — sin `any`
- [x] Sanitización anti-XSS (RNF-SEC-02)
- [x] Cache TTL 30 min (RNF-PERF-01)
- [x] 10 tests tipados (RNF-TEST-01)
- [x] Sin CSS externo — solo Tailwind
- [x] Manejo de errores ProblemDetails (ADR-0003)
- [x] Token Bearer en cada request (RF-01)
