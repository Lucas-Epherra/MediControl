# MediControl — Arquitectura

## 1. Vista general

```
┌──────────────────────┐   HTTPS + JWT (Bearer)   ┌──────────────────────┐   Prisma   ┌──────────────┐
│ apps/web (Next.js)   │ ───────────────────────► │ apps/api (NestJS)    │ ─────────► │ PostgreSQL   │
│ Vercel               │ ◄─────────────────────── │ Render               │            │ Neon/Render  │
│ consulta cada 30 s   │        JSON              │ Swagger en /docs     │            │              │
└──────────────────────┘                          └──────────────────────┘            └──────────────┘
```

- **Monorepo pnpm**: `apps/api` (backend) y `apps/web` (frontend, se define después).
- **Backend**: NestJS 11, Prisma 6, PostgreSQL 16, JWT, `class-validator`, Luxon para fechas.
- **Base local**: `docker compose up -d` (PostgreSQL en el puerto 5433).
- **Sin tiempo real**: la vista del día se vuelve a pedir cada 30 s y al volver el foco a la pestaña.

## 2. Modelo de datos

```
User ─┬─< Membership >─┬─ CareGroup ─┬─< Medication ─┬─< Schedule ─< DoseRecord
      │   (role)       │             │               └─< StockMovement
      │                │             ├─< Prescription (opcional → Medication)
      │                └─────────────┴─< Invitation
      └─ recordedBy en DoseRecord / StockMovement
```

| Entidad | Campos clave | Notas |
|---|---|---|
| `User` | email (único), passwordHash, name | bcrypt. |
| `CareGroup` | name, patientName, patientBirthDate, patientAllergies, patientConditions, notes, doctorName, doctorSpecialty, doctorPhone, doctorEmail, timezone | Un grupo = una persona cuidada. `timezone` IANA, por defecto `America/Argentina/Buenos_Aires`. Un solo médico de cabecera por ahora (si hacen falta más, tabla propia). |
| `Membership` | userId, groupId, role | `UNIQUE(userId, groupId)`. Roles: `ADMIN`, `CAREGIVER` (`VIEWER` se quitó en #26; la migración pasó esas membresías a `CAREGIVER`). |
| `Invitation` | groupId, email?, role, tokenHash, expiresAt, acceptedAt, revokedAt | Se guarda solo el hash SHA-256 del token. |
| `Medication` | name, strength ("10 mg"), form, instructions, stock, lowStockThreshold, active | `stock` en unidades (comprimidos, ml, gotas). Admite medias unidades. |
| `Schedule` | medicationId, timeOfDay ("08:00"), daysOfWeek[], unitsPerDose, startDate, endDate?, active | `daysOfWeek` vacío = todos los días; 1 = lunes … 7 = domingo. |
| `DoseRecord` | scheduleId, scheduledFor (UTC), status, recordedById, recordedAt, notes, undoneAt?, undoneById? | **`UNIQUE(scheduleId, scheduledFor, undoneAt) NULLS NOT DISTINCT`**: una sola toma vigente por ocurrencia. Status: `GIVEN`, `SKIPPED`. Deshacer marca `undoneAt`, no borra. |
| `StockMovement` | medicationId, type, delta, stockAfter, doseRecordId?, createdById | Tipos: `RESTOCK`, `ADJUSTMENT`, `DOSE`, `DOSE_REVERTED`. |
| `Prescription` | groupId, medicationId?, description, issuedAt?, expiresAt | Recetas u órdenes médicas. |

Medicamentos y horarios se **archivan** (`active = false`); no se borran, para no perder el historial.

## 3. Decisiones técnicas

### 3.1 Las tomas programadas son virtuales

No se generan filas por adelantado. Una toma programada se identifica por **(horario, instante)**:
`scheduledFor` = fecha local + `timeOfDay` en la zona del grupo, convertido a UTC.

La vista del día calcula las ocurrencias de los horarios vigentes y las cruza con los `DoseRecord` de
ese día. Solo se escribe una fila cuando alguien registra la toma. Ventajas: no hace falta un cron,
y editar un horario no deja filas "fantasma". Si un horario cambia de hora, los registros viejos se
siguen mostrando en el día, porque la vista también incluye los registros que no coinciden con
ninguna ocurrencia actual.

### 3.2 Evitar tomas duplicadas (punto técnico)

1. La base garantiza `UNIQUE(scheduleId, scheduledFor, undoneAt) NULLS NOT DISTINCT`: si dos
   cuidadores registran al mismo tiempo, uno de los dos `INSERT` falla aunque las validaciones en
   código hayan pasado. `NULLS NOT DISTINCT` (PostgreSQL 15+) hace que dos tomas vigentes
   (`undoneAt` nulo) choquen; las deshechas no impiden volver a registrar. Prisma no expresa esa
   cláusula: está escrita a mano en la migración `deshacer_auditado`.
2. El registro y el descuento de stock van en **una transacción**: si el `INSERT` falla, el stock no cambia.
3. La API responde `409 Conflict` con quién registró la toma y cuándo, para que el front lo muestre.
4. Además se valida que `scheduledFor` sea una ocurrencia real del horario (hora, día de la semana
   y vigencia) y que no esté a más de 2 h en el futuro.
5. **Deshacer no borra.** Marca la toma con `undoneAt` y `undoneById`, devuelve el stock (movimiento
   `DOSE_REVERTED` ligado a la toma) y libera la ocurrencia. La vista del día ignora las deshechas;
   el historial las muestra con quién las deshizo, junto con su nota original. Deshacer dos veces
   responde `409`.

### 3.3 Acceso al grupo (punto técnico)

- Todas las rutas de datos cuelgan de `/groups/:groupId/...`.
- `GroupAccessGuard` busca la membresía del usuario en ese grupo. Si no existe responde **404**
  (no 403), para no revelar qué grupos existen. Si existe pero el rol no alcanza, responde **403**.
- Los servicios siempre consultan con `where: { id, groupId }` (o a través de la medicación del grupo),
  así un ID de otro grupo nunca se resuelve aunque se conozca.

| Acción | ADMIN | CAREGIVER |
|---|:-:|:-:|
| Ver día, historial, plan, avisos | ✔ | ✔ |
| Registrar / deshacer toma propia | ✔ | ✔ |
| Deshacer toma de otro | ✔ | — |
| Reponer / ajustar stock | ✔ | ✔ |
| Editar plan, recetas, grupo | ✔ | — |
| Invitar, cambiar roles, quitar miembros | ✔ | — |

Siempre debe quedar al menos un `ADMIN` en el grupo.

### 3.4 Estados de una toma en la vista del día

Con `t` = hora programada y `ahora` = hora actual:

| Estado | Condición |
|---|---|
| `GIVEN` / `SKIPPED` | Existe un `DoseRecord`. |
| `UPCOMING` | `ahora < t − 30 min` |
| `DUE` | `t − 30 min ≤ ahora ≤ t + 60 min` |
| `OVERDUE` | `ahora > t + 60 min` sin registro |

Las ventanas son constantes en `apps/api/src/doses/dose-status.ts`.

### 3.5 Avisos

Se calculan al pedirlos (no se guardan):

- `LOW_STOCK`: `stock ≤ lowStockThreshold`, o si la cobertura es de 3 días o menos.
  Cobertura = `stock / consumo diario`, y el consumo diario = Σ `unitsPerDose × díasPorSemana / 7`
  de los horarios vigentes.
- `PRESCRIPTION_EXPIRING`: vence en 7 días o menos.
- `PRESCRIPTION_EXPIRED`: ya venció.

### 3.6 Autenticación

- `POST /auth/register` y `POST /auth/login` devuelven `{ accessToken, user }`. El token dura 7 días.
- `JwtAuthGuard` es global; las rutas públicas se marcan con `@Public()`.
- Sin refresh tokens en el MVP.

## 4. API

Base: `/api`. Documentación interactiva: `/docs` (Swagger).

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crear cuenta |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/me` | Usuario actual |
| PATCH | `/auth/me` | Uno mismo — `{ name?, email?, currentPassword? }`. Cambiar el email pide `currentPassword`; si no coincide, **400** (no 401, para no cerrar la sesión). Email ya usado: **409** |
| PATCH | `/auth/me/password` | Uno mismo — `{ currentPassword, newPassword }` (mínimo 8). Responde 204; la sesión sigue activa |

### Grupos y miembros
| Método | Ruta | Rol |
|---|---|---|
| GET | `/groups` | Mis grupos con mi rol |
| POST | `/groups` | Crear grupo (quedo como ADMIN) |
| GET | `/groups/:groupId` | Miembro |
| PATCH | `/groups/:groupId` | ADMIN — también datos de la persona cuidada y del médico. `patientBirthDate` en `YYYY-MM-DD`, `doctorPhone` solo dígitos, espacios, `+`, `-` y paréntesis; `null` borra un dato |
| GET | `/groups/:groupId/members` | Miembro |
| PATCH | `/groups/:groupId/members/:userId` | ADMIN — cambiar rol |
| DELETE | `/groups/:groupId/members/:userId` | ADMIN, o uno mismo para salir |

### Invitaciones
| Método | Ruta | Rol |
|---|---|---|
| POST | `/groups/:groupId/invitations` | ADMIN → devuelve `token` y `url` (se muestra una sola vez) |
| GET | `/groups/:groupId/invitations` | ADMIN — pendientes |
| DELETE | `/groups/:groupId/invitations/:invitationId` | ADMIN — revocar |
| GET | `/invitations/:token` | Público — vista previa (grupo, rol, quién invita) |
| POST | `/invitations/:token/accept` | Usuario autenticado |

### Plan de medicación y stock
| Método | Ruta | Rol |
|---|---|---|
| GET | `/groups/:groupId/medications?status=active/archived/all` | Miembro — `active` por defecto (`includeInactive=true` equivale a `all`); incluye `dailyUnits`, `coverageDays` y `lowStock` (mismo criterio que el aviso) |
| POST | `/groups/:groupId/medications` | ADMIN (admite `schedules[]` en el mismo pedido) |
| GET / PATCH / DELETE | `/groups/:groupId/medications/:medicationId` | Miembro / ADMIN / ADMIN (archiva). El GET trae solo horarios activos |
| POST | `/groups/:groupId/medications/:medicationId/schedules` | ADMIN |
| PATCH / DELETE | `/groups/:groupId/medications/:medicationId/schedules/:scheduleId` | ADMIN |
| POST | `/groups/:groupId/medications/:medicationId/stock` | ADMIN, CAREGIVER |
| GET | `/groups/:groupId/medications/:medicationId/stock-movements` | Miembro |
| GET | `/groups/:groupId/plan-sheet` | Miembro — hoja del plan para imprimir, ya armada: `allergies` de la persona cuidada, `slots` (horarios vigentes o futuros agrupados por hora, con `medication`, `dose`, `instructions`, `days` y `period` en texto) y `prescriptions` (por vencimiento, con `status` y `daysLeft`). Sin medicamentos archivados ni horarios vencidos |

`POST .../stock`: `{ "type": "RESTOCK", "quantity": 30 }` suma; `{ "type": "ADJUSTMENT", "quantity": 12 }`
fija el conteo real.

### Tomas
| Método | Ruta | Rol |
|---|---|---|
| GET | `/groups/:groupId/day?date=YYYY-MM-DD` | Miembro (sin `date` = hoy en la zona del grupo). Cada toma trae `medication.stock` y `medication.lowStock` (mismo criterio que el aviso) |
| GET | `/groups/:groupId/day/summary?date=YYYY-MM-DD` | Miembro — `{ date, text }`: resumen del día en texto plano para compartir por WhatsApp (por estado, con responsable y motivo; si es hoy, también los avisos). Sin emojis |
| GET | `/groups/:groupId/days?from=YYYY-MM-DD&to=YYYY-MM-DD` | Miembro — calendario: por cada día del rango (inclusive, máximo 62) `{ date, total, GIVEN, SKIPPED, OVERDUE, DUE, UPCOMING }`, con las mismas reglas que la vista del día. También devuelve `today` en la zona del grupo |
| POST | `/groups/:groupId/doses` | ADMIN, CAREGIVER |
| DELETE | `/groups/:groupId/doses/:doseId` | Quien registró (24 h) o ADMIN — marca la toma como deshecha (no la borra) |
| GET | `/groups/:groupId/doses?from=&to=&medicationId=&recordedById=&status=&undone=` | Miembro — historial; incluye `recorders` del período. `undone=true` solo deshechas, `false` solo vigentes, sin indicar todas |

```jsonc
// POST /groups/:groupId/doses
{ "scheduleId": "uuid", "scheduledFor": "2026-11-13T11:00:00.000Z", "status": "GIVEN", "notes": "con el desayuno" }

// 409 si ya estaba registrada
{ "statusCode": 409, "message": "Esta toma ya fue registrada por Ana a las 14:31",
  "existing": { "id": "…", "status": "GIVEN", "recordedAt": "…", "recordedBy": { "id": "…", "name": "Ana" } } }
```

### Recetas y avisos
| Método | Ruta | Rol |
|---|---|---|
| GET | `/groups/:groupId/prescriptions` | Miembro — incluye `status` (`VALID`, `EXPIRING` o `EXPIRED`) y `daysLeft` |
| POST / PATCH / DELETE | `/groups/:groupId/prescriptions[/:prescriptionId]` | ADMIN |
| GET | `/groups/:groupId/alerts` | Miembro |

## 5. Estructura del backend

```
apps/api/
├── prisma/            schema.prisma, migraciones, seed.ts
└── src/
    ├── main.ts        prefijo /api, ValidationPipe, CORS, Swagger
    ├── prisma/        PrismaService
    ├── common/        decoradores, filtro de errores de Prisma, utilidades de fecha
    ├── auth/          registro, login, JwtAuthGuard global, @Public, @CurrentUser
    ├── groups/        grupos, miembros, invitaciones, GroupAccessGuard, @GroupRoles
    ├── medications/   medicamentos, horarios, stock
    ├── doses/         vista del día, registro de tomas, historial, cálculo de ocurrencias
    ├── prescriptions/
    └── alerts/
```

## 6. Despliegue

| Pieza | Dónde | Variables |
|---|---|---|
| API | Render (Web Service, Node 22) | `DATABASE_URL`, `JWT_SECRET`, `WEB_URL`, `CORS_ORIGINS` |
| Base | Neon o Render PostgreSQL | — |
| Web | Vercel | `NEXT_PUBLIC_API_URL` |

Comando de build en Render: `pnpm install --frozen-lockfile && pnpm --filter api build && pnpm --filter api exec prisma migrate deploy`.
Inicio: `pnpm --filter api start:prod`.
