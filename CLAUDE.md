# MediControl

Registro compartido de medicación para coordinar el cuidado de un adulto mayor entre familiares y
cuidadores. Hackatón de 2 personas: **Lucas** y **Lorenzo**; los dos tocan backend y frontend. Prima una demo
funcionando sobre muchas pantallas a medias.

Documentación: `README.md`, `docs/PLAN.md` (alcance, roles, guion de demo), `docs/ARQUITECTURA.md`
(modelo, estados de tomas, endpoints). Swagger en <http://localhost:3001/docs>.

## Estructura

```
apps/api   NestJS 11 + Prisma 6 + PostgreSQL (backend)
apps/web   Next.js App Router + TypeScript + Tailwind (frontend)
docs/      planificación y arquitectura
```

Monorepo pnpm (Node >= 22, pnpm 10.34.1, Docker para PostgreSQL).

## Comandos (desde la raíz)

```bash
pnpm install
pnpm db:up          # PostgreSQL en localhost:5433
pnpm db:migrate
pnpm db:seed        # datos de demo; volver a correrlo antes de la demo
pnpm dev:api        # http://localhost:3001/api
pnpm dev:web        # http://localhost:3000
pnpm build:web
```

Usuarios de demo (contraseña `demo1234`): `lucas@example.com` (ADMIN), `ana@example.com`
(CAREGIVER), `sofia@example.com` (CAREGIVER).

## Reglas

- **Filtros y parámetros se resuelven en el backend.** Si una pantalla necesita filtrar u ordenar, se suma el
  parámetro al endpoint de `apps/api` (DTO, servicio, test e2e y `docs/ARQUITECTURA.md`) y el front solo lo
  manda; nunca se filtra en el cliente. Quien hace la pantalla hace también ese cambio y lo anota en la issue.
- Ramas: `main` ← `dev` ← `feat/<tema>`. Cada issue sale de `dev` y vuelve por PR a `dev`. Nunca commitear a `main`.
  Commits chicos y mensajes claros, sin líneas de atribución (`Co-Authored-By`, "Generated with…").
- Prioridad: Nivel 1 (login/registro, grupo, vista del día, avisos, reponer stock, historial) →
  Nivel 2 (ABM de plan y recetas) → Nivel 3 (invitaciones y miembros). No pasar de nivel sin terminar el anterior.

## Frontend (`apps/web`)

- Next.js App Router, TypeScript estricto, Tailwind. Mobile-first (se usa desde el celular).
- URL de la API en `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3001/api`).
- Todas las llamadas pasan por el cliente tipado de `src/lib/api`; nunca `fetch` suelto en componentes.
  Envía `Authorization: Bearer <JWT>`. Ante un **401** cierra sesión y redirige a `/login`.
- Los tipos de las respuestas reflejan los DTOs reales de `apps/api/src`.
- Vista del día: se vuelve a pedir cada 30 s y al recuperar el foco de la pestaña (sin WebSocket).
- Roles en la UI (solo dos, `ADMIN` y `CAREGIVER`): solo `ADMIN` edita plan, recetas, grupo, invitaciones
  y miembros. `CAREGIVER` registra tomas y repone stock.

## Manejo de errores

- La API devuelve `{ statusCode, message }`. Se muestra el `message` tal cual al usuario.
- **409** al registrar una toma: mostrar el `message` ("Esta toma ya fue registrada por Ana a las 14:31")
  y refrescar la vista del día.
- 404 en un grupo = no existe o no pertenece al usuario. 403 = rol insuficiente.
- Nunca dejar un error sin mostrar ni una pantalla en blanco: siempre estado de carga, error y vacío.

## Interfaz

- **Todos los textos en español (Argentina)**, tono claro y simple.
- Diseño sobrio, letra grande, alto contraste. Los usuarios son familiares no técnicos.
- Cada estado se distingue por color **y** por texto o ícono (nunca solo color):
  `GIVEN` dada, `SKIPPED` omitida, `DUE` toca ahora, `UPCOMING` pendiente, `OVERDUE` atrasada (rojo).
- Horas y fechas se muestran en la zona horaria del grupo (`group.timezone`), no la del navegador.
