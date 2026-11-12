# MediControl

Registro compartido de medicación para coordinar el cuidado de un adulto mayor entre familiares y
cuidadores. Proyecto de hackatón (48 h, 2 personas).

- [Plan del MVP](docs/PLAN.md): alcance, historias, reparto y guion de la demo.
- [Arquitectura](docs/ARQUITECTURA.md): modelo de datos, decisiones técnicas y API.

## Estructura

```
apps/api   NestJS 11 + Prisma 6 + PostgreSQL (backend)
apps/web   Next.js 16 + Tailwind 4 + TanStack Query (frontend)
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
