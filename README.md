# MediControl

Registro compartido de medicación para coordinar el cuidado de un adulto mayor entre familiares y
cuidadores. Proyecto de hackatón (48 h, 2 personas).

- [Plan del MVP](docs/PLAN.md): alcance, historias, reparto y guion de la demo.
- [Arquitectura](docs/ARQUITECTURA.md): modelo de datos, decisiones técnicas y API.

## Estructura

```
apps/api   NestJS 11 + Prisma 6 + PostgreSQL (backend)
apps/web   Next.js 16 + Tailwind 3 + TanStack Query (frontend)
docs/      planificación y arquitectura
```

## Puesta en marcha

Requisitos: Node 22, pnpm 10 y Docker.

```bash
pnpm install
pnpm db:up                                   # PostgreSQL en localhost:5433
cp apps/api/.env.example apps/api/.env       # cambiar JWT_SECRET
pnpm db:migrate                              # aplica migraciones
pnpm db:seed                                 # datos de demo
pnpm dev:api                                 # http://localhost:3001/api
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web                                 # http://localhost:3000
```

Swagger: <http://localhost:3001/docs>.

### Usuarios de demo

Contraseña `demo1234`, grupo "Cuidado de Marta":

| Email | Rol |
|---|---|
| `lucas@example.com` | ADMIN |
| `ana@example.com` | CAREGIVER |
| `sofia@example.com` | VIEWER |

El seed genera las tomas a partir de la hora en que se ejecuta: ayer completo, hoy registradas hasta
hace un rato, una atrasada y el resto pendientes. Conviene volver a correrlo antes de la demo.

## Tests

```bash
pnpm test:api        # unitarios: ocurrencias, estados y avisos
pnpm test:api:e2e    # e2e contra PostgreSQL (schema "e2e", no toca los datos de desarrollo)
```

Los e2e cubren los dos puntos técnicos del MVP: acceso restringido al grupo y rechazo de tomas
duplicadas aunque lleguen en paralelo.

## Despliegue

| Pieza | Dónde | URL |
|---|---|---|
| Web | Vercel, proyecto `medicontrol` (equipo FellowshipDevs), raíz `apps/web` | <https://medicontrol-nu.vercel.app> |
| API | Render, servicio `medicontrol-api` (`render.yaml`, rama `main`) | <https://medicontrol-api-jpv8.onrender.com/api> |
| Base | Neon (PostgreSQL 16) | — |

- La API se despliega sola al mergear en `main`; el build aplica las migraciones (`prisma migrate deploy`).
  Las variables `WEB_URL` y `CORS_ORIGINS` se cambian en `render.yaml`, no en el panel de Render.
- La web todavía no está conectada a GitHub en Vercel: se despliega desde la raíz del repo con
  `npx vercel deploy --prod` (la primera vez, `npx vercel link --project medicontrol`). `.vercelignore`
  deja afuera los `.env` y los builds locales.
- El plan gratuito de Render duerme el servicio: conviene abrir la API un minuto antes de la demo.
