RF-13 Dashboard KPIs

Endpoint principal:
- `GET /api/v1/dashboard/kpis`

Alias legacy:
- `GET /api/v1/kpis/summary`

Fuentes de datos:
- Work orders: `apps/api/src/infra/repositories/workorder.repo.ts`
- Inventario: `apps/api/src/domain/services/invetory.service.ts`
- Usuarios (RB-06): `apps/api/src/infra/repositories/user.repo.ts`

Reglas de validez aplicadas:
- Solo se cuentan work orders con estados validos de `WorkOrderStatus`.
- Se excluyen work orders con fechas invalidas.
- Si `createdByUserId` existe, el usuario debe existir y no estar bloqueado.

KPI-01 Solicitudes creadas hoy (por tipo)
- Formula: `count(workOrders where createdAt=today) grouped by type`
- Campo respuesta: `kpis.kpi01CreatedTodayByType`

KPI-02 Solicitudes completadas hoy
- Formula: `count(workOrders where status=COMPLETED and completedAt=today)`
- Campo respuesta: `kpis.kpi02CompletedToday`

KPI-03 Tasa de cancelacion
- Formula: `cancelled / total_valid * 100`
- Campo respuesta: `kpis.kpi03CancellationRate`

KPI-04 Tiempo promedio de ciclo por tipo
- Formula: `avg(hours(createdAt -> completedAt)) grouped by type`
- Campo respuesta: `kpis.kpi04AvgCycleHoursByType`

KPI-05 Backlog por estado
- Formula: `count(valid workOrders in non terminal statuses)`
- Campo respuesta: `kpis.kpi05BacklogByStatus`

KPI-06 Inventario critico por sucursal
- Formula: `count(inventory where qtyAvailable <= threshold) grouped by branch`
- Threshold actual: `10`
- Campo respuesta: `kpis.kpi06CriticalInventoryByBranch`

KPI-07 Top 5 productos mas reservados
- Formula: `top 5 by sum(qtyReserved) across inventory rows`
- Campo respuesta: `kpis.kpi07TopReservedProducts`

KPI-08 Reclamaciones por categoria de falla
- Formula: `count(CLAIM_TROUBLESHOOT) grouped by failure category`
- Nota: en el modelo actual se clasifica `CONFLICT` y `UNSPECIFIED`
- Campo respuesta: `kpis.kpi08ClaimsByFailureCategory`

KPI-09 Tiempo promedio de resolucion de reclamaciones
- Formula: `avg(hours(createdAt -> completedAt)) for completed CLAIM_TROUBLESHOOT`
- Campo respuesta: `kpis.kpi09AvgClaimResolutionHours`

KPI-10 Porcentaje de instalaciones fallidas / re-trabajo
- Formula implementada: `failed installations(REJECTED|CONFLICT) / installation total * 100`
- Tipos considerados: `NEW_SERVICE_INSTALL`, `SERVICE_UPGRADE`
- Campo respuesta: `kpis.kpi10FailedInstallationsRate`

Formato para frontend dashboard:
- `generatedAt`, `timezone`, `source`, `kpis`, `cards`, `validationRules`
- `cards` es el arreglo listo para widgets de resumen en UI.
