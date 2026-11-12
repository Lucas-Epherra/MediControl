# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cuidadores (familiares y cuidadores contratados)** que se turnan para cuidar a un adulto mayor. Abren MediControl al iniciar o durante su turno para saber qué se administró, qué está atrasado y qué queda pendiente, y para registrar las tomas que dan. Rol `CAREGIVER`.
- **Administrador del grupo** (por lo general un familiar que organiza el cuidado): crea el grupo, carga el plan de medicación, recetas y stock, e invita a los demás con un rol. Rol `ADMIN`.
- **Observadores** (familiares que siguen el cuidado a distancia): ven todo, no registran ni editan. Rol `VIEWER`.

Entre los cuidadores puede haber personas mayores o con poca práctica digital.

Uso repartido por igual entre celular y escritorio: el registro de tomas suele hacerse en el celular junto a la persona cuidada; la carga del plan, el stock y las recetas también desde la computadora.

## Product Purpose

Registro compartido de medicación para coordinar el cuidado de un adulto mayor entre varias personas. Cuando los cuidadores se turnan cuesta saber si una dosis ya se dio y cuándo reponer; eso provoca olvidos o tomas repetidas.

Éxito: cualquier cuidador, al abrir el día, sabe en segundos el estado de cada toma (dada, omitida, en ventana, atrasada, próxima), quién la registró y a qué hora, y nadie puede registrar dos veces la misma toma.

Criterio de la demo (hackatón, 48 h, 2 personas): dos cuidadores en dos navegadores ven el mismo plan del día; uno registra una toma, el otro la ve con hora y responsable, y si intenta registrarla de nuevo el sistema lo rechaza indicando quién la dio.

## Positioning

No es un recordatorio personal de pastillas: es un registro **compartido por un grupo de cuidado** con responsables y hora en cada toma. La garantía de no duplicar está en la base de datos (`UNIQUE(scheduleId, scheduledFor)` en una transacción con el descuento de stock), no solo en la interfaz, y el rechazo le dice al segundo cuidador quién dio la dosis y cuándo.

## Operating Context

- Una persona cuidada por grupo; zona horaria por grupo (por defecto `America/Argentina/Buenos_Aires`).
- Ritual central: al empezar el turno se abre la vista del día; se marca cada toma como dada u omitida (con motivo), y se puede deshacer.
- Sin tiempo real: la vista del día se vuelve a pedir cada 30 s y al volver el foco a la pestaña.
- Los avisos (stock bajo, recetas por vencer o vencidas) solo se ven en el panel; no hay notificaciones push, email ni WhatsApp.
- Invitaciones por enlace con rol, de un solo uso y con vencimiento a 7 días.

## Capabilities and Constraints

- Funcionalidad del MVP (F1–F10 en `docs/PLAN.md`): cuentas con email y contraseña, grupo de cuidado, invitaciones y roles, plan de medicación con horarios, vista del día, registro y deshacer de tomas, historial, stock con movimientos, recetas con vencimiento y avisos en panel.
- Estados de una toma: `GIVEN`, `SKIPPED`, `DUE` (de 30 min antes a 60 min después), `OVERDUE`, `UPCOMING` (`docs/ARQUITECTURA.md` §3.4).
- Permisos por rol (`docs/ARQUITECTURA.md` §3.3): `VIEWER` no registra ni edita; solo `ADMIN` edita plan, recetas, grupo y miembros; `CAREGIVER` registra tomas y repone stock.
- Un usuario ajeno a un grupo recibe 404 (no se revela que el grupo existe); conflicto de toma duplicada = 409 con `existing.recordedBy` y `recordedAt`.
- Medicamentos y horarios se archivan, no se borran. El stock admite medias unidades.
- Stack: monorepo pnpm; `apps/api` NestJS 11 + Prisma 6 + PostgreSQL (desplegada en Render + Neon); `apps/web` Next.js, todavía no creada, prevista en Vercel. Contrato: Swagger en `/docs`.
- Fuera del MVP: notificaciones, medicación SOS, varias personas cuidadas por grupo, foto de receta, WebSocket, recuperación de contraseña.

## Brand Commitments

- Nombre: **MediControl**.
- Idioma de la interfaz: español rioplatense con voseo ("Registrá la toma", "Revisá el formato del email"). Lenguaje simple y directo, títulos "claros y sin culpa".
- No hay logo ni otros activos de marca todavía.
- Referencia visual elegida por el equipo: el canvas de diseño de Lolo (https://claude.ai/artifact/4hw3U5o8vfvEKfrSdYWz28), con 35 pantallas y su hoja de sistema de diseño.

## Evidence on Hand

- Datos de demo en `apps/api/prisma/seed.ts`: grupo "Cuidado de Marta", usuarios Lucas (ADMIN), Ana (CAREGIVER) y Sofía (VIEWER), tomas de ayer y hoy generadas relativas a la hora de ejecución.
- Guion de demo de 3 minutos en `docs/PLAN.md` §5.
- No existen testimonios, usuarios reales, métricas ni respaldo clínico: no inventarlos.

## Product Principles

1. **El estado del día se entiende de un vistazo.** Qué falta, qué está atrasado y quién dio qué es la información principal; todo lo demás es secundario.
2. **Cada registro tiene responsable y hora.** La confianza entre cuidadores sale de ver quién hizo qué y cuándo.
3. **Evitar el error vale más que la velocidad.** Duplicar u olvidar una dosis es el daño que el producto existe para prevenir; los conflictos se explican, no solo se bloquean.
4. **Usable por cualquier cuidador.** Sin jerga técnica ni gestos ocultos; tiene que funcionar para una persona mayor con el celular en la mano.
5. **El alcance del MVP manda.** Lo que está en el backlog queda afuera hasta tener la demo completa.

## Accessibility & Inclusion

- WCAG 2.2 AA como mínimo.
- Pensado también para cuidadores mayores o con poca práctica digital: texto legible en tamaño generoso, objetivos táctiles amplios, lenguaje simple, estados que no dependan solo del color (por ejemplo, "atrasada" también con texto o icono).
