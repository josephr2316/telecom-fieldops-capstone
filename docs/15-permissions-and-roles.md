# Permisos y roles (API)

Este documento describe los roles de la API (auth), los permisos que tienen y **qué usuario puede acceder a qué** en órdenes de trabajo y en el resto de la aplicación.

## Origen de los datos

- **Roles y usuarios de login** vienen de `scripts/seed-data.json`: `authRoles` y `authUsers`.
- El seed escribe en las tablas `roles` y `users`. El middleware de auth carga permisos con `userRepository.getPermissionKeysForRoles(user.roles)` (por **nombre** de rol).
- Si en producción ves **403 "Insufficient permissions"** en "Mis órdenes" o listado de órdenes, comprueba que en la BD los roles tengan los `permission_keys` correctos (por ejemplo ejecutando el seed con `RUN_SEED=force` desde `apps/api`).

## Roles de la API (authRoles en seed)

| Rol        | ID en seed    | Permisos (permissionKeys) |
|-----------|----------------|---------------------------|
| admin     | role-admin     | `*` (todo)                |
| tecnico   | role-tecnico   | `workorders:view-own`, `workorders:update-state` |
| supervisor| role-supervisor| `workorders:*`, `inventory:view` |
| ventas    | role-ventas    | `workorders:create`, `inventory:reserve` |
| security  | role-security  | `audit:read`, `users:read`, `roles:read` |

## Usuarios de prueba (authUsers en seed)

| Usuario   | Email                  | Rol       |
|-----------|------------------------|-----------|
| admin     | admin@telecom.local    | admin     |
| técnico   | tecnico@telecom.local  | tecnico   |
| supervisor| supervisor@telecom.local | supervisor |
| ventas    | ventas@telecom.local   | ventas    |
| security  | security@telecom.local | security  |

(Contraseña de desarrollo suele ser la misma para todos; en producción debe cambiarse.)

## Tabla: qué usuario puede acceder a qué

Referido a **órdenes de trabajo** y acciones relacionadas. Las rutas comprueban permisos con `requireAnyPermission` o `requirePermissions` en `apps/api/src/routes/workorders.routes.ts`.

| Usuario   | Rol       | Listar órdenes | Ver detalle orden | Crear orden | Asignar técnico | Cambiar estado | Tech-details (notas/checklist) |
|-----------|-----------|----------------|-------------------|-------------|-----------------|----------------|--------------------------------|
| **admin** | admin     | Sí (todas)     | Sí                | Sí          | Sí              | Sí             | Sí                             |
| **técnico** | tecnico | Solo asignadas | Solo asignadas a él | No        | No              | Sí             | Sí                             |
| **supervisor** | supervisor | Sí (todas) | Sí                | No*         | Sí              | Sí             | Sí                             |
| **ventas** | ventas   | No             | No                | Sí          | No              | No             | No                             |
| **security** | security | No           | No                | No          | No              | No             | No                             |

\* Supervisor tiene `workorders:*`, que incluye en principio cualquier acción de workorders; si en el futuro se añade comprobación explícita de `workorders:create`, el rol podría no tenerla. Hoy crear orden exige `workorders:create`; supervisor tiene `workorders:*` → sí puede crear.

- **Listar / ver detalle**: requieren `workorders:read` **o** `workorders:view-own`. Quien tiene `view-own` solo ve las órdenes donde `assigned_tech_user_id = user.id`.
- **Crear**: `workorders:create`.
- **Asignar técnico**: `workorders:assign` o `workorders:*`.
- **Cambiar estado / tech-details**: `workorders:update-state`.

## Otros accesos por rol

- **Security**: pensado para auditoría y consulta de usuarios/roles: `audit:read`, `users:read`, `roles:read`. No tiene permisos de work orders ni inventario.
- **Ventas**: puede crear órdenes y reservar inventario; no puede listar ni ver órdenes (no tiene `workorders:read` ni `workorders:view-own`).
- **Admin**: acceso total (`*`).

## Si sigue saliendo 403 en producción

1. Asegúrate de que el **deploy** tiene el código actual de `workorders.routes.ts` (uso de `hasPermission` y `requireAnyPermission(['workorders:read', 'workorders:view-own'])`).
2. Comprueba en la BD que el rol **admin** tenga `permission_keys` con `*` y que **tecnico** tenga `workorders:view-own` y `workorders:update-state`.
3. Ejecutar el seed (con `RUN_SEED=force` si ya hay usuarios) desde `apps/api` para reaplicar roles y usuarios del seed.
