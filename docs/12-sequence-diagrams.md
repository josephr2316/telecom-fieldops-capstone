Diagramas de secuencia (minimo 2)

1) Flujo principal: crear solicitud -> reservar inventario -> cambio de estado -> auditoria

```mermaid
sequenceDiagram
    participant Sales as Ventas
    participant Web as Frontend
    participant API as API /api/v1
    participant WO as WorkOrderService
    participant INV as InventoryService
    participant AUD as AuditService

    Sales->>Web: Completa formulario de solicitud
    Web->>API: POST /work-orders (Bearer + X-Correlation-Id)
    API->>WO: createWorkOrder(payload)
    WO->>AUD: AUD-05 WORKORDER_CREATED
    API-->>Web: 201 WorkOrder (status=DRAFT, version=0)

    Sales->>Web: Cambiar estado a INVENTORY_RESERVATION
    Web->>API: PATCH /work-orders/{id}/status (newStatus, baseVersion)
    API->>WO: updateStatus(id, payload)
    WO->>WO: Validar transicion (state machine)
    WO->>INV: reserveForRequest(workOrderId, branchId, items)
    alt stock insuficiente
        INV-->>WO: Error de negocio
        WO-->>API: 409 ProblemDetails (stock_insufficient)
        API-->>Web: 409 Conflict
    else reserva exitosa
        INV-->>WO: Reserva aplicada
        WO->>AUD: AUD-06 WORKORDER_STATUS
        WO-->>API: WorkOrder actualizado (version+1)
        API-->>Web: 200 OK
    end
```

2) Flujo tecnico offline: cola local -> export JSON -> import y conflictos por baseVersion

```mermaid
sequenceDiagram
    participant Tech as Tecnico
    participant Web as Frontend (MyOrdersPage)
    participant LS as LocalStorage
    participant API as API /api/v1/sync/import
    participant Sync as SyncService
    participant WO as WorkOrderService

    Tech->>Web: Actualiza notas/checklist sin internet
    Web->>LS: pushToOfflineQueue(PATCH_TECH_DETAILS)

    Tech->>Web: Cambia estado sin internet
    Web->>LS: pushToOfflineQueue(PATCH_STATUS + baseVersion)

    Tech->>Web: Exportar cola offline
    Web->>LS: getOfflineQueue()
    Web-->>Tech: Archivo JSON (meta + items)

    Tech->>Web: Importar JSON para sincronizar
    Web->>API: POST /sync/import (meta + operations)
    API->>Sync: import(body, actorUserId, correlationId)
    Sync->>WO: validar existencia y version actual
    alt baseVersion != version servidor
        WO-->>Sync: conflicto
        Sync-->>API: conflictCount + conflicts[]
        API-->>Web: 200 OK con conflictos
    else version valida
        Sync->>WO: aplicar CHANGE_STATUS/ADD_NOTE
        Sync-->>API: appliedCount
        API-->>Web: 200 OK aplicado
    end
```
