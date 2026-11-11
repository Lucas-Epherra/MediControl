# MediControl — Plan del MVP

Propuesta elegida: **1. Coordinación del cuidado de un adulto mayor**.
Restricción: 48 horas, dos personas, demo funcionando el viernes.

## 1. Problema y objetivo

Cuando familiares y cuidadores se turnan, cuesta saber si ya se dio una dosis y cuándo hay que
reponer la medicación. Eso provoca olvidos o tomas repetidas.

MediControl es un registro compartido que cada cuidador abre al iniciar su turno para ver qué se
administró, qué está atrasado y qué queda pendiente.

**Criterio de éxito de la demo:** dos cuidadores, en dos navegadores, ven el mismo plan del día; uno
registra una toma, el otro la ve con hora y responsable, y si intenta registrarla de nuevo el sistema
lo rechaza indicando quién la dio.

## 2. Alcance

### Dentro del MVP

| # | Funcionalidad | Detalle |
|---|---|---|
| F1 | Cuentas | Registro e inicio de sesión con email y contraseña (JWT). |
| F2 | Grupo de cuidado | Un grupo por persona cuidada (nombre, notas, zona horaria). Quien lo crea es administrador. |
| F3 | Invitaciones y roles | El administrador genera un enlace de invitación con rol. Roles: `ADMIN`, `CAREGIVER`, `VIEWER`. |
| F4 | Plan de medicación | Medicamentos (nombre, dosis, unidades por toma, stock, umbral de stock bajo) con uno o varios horarios (hora + días de la semana + vigencia). |
| F5 | Vista del día | Tomas del día con estado: `GIVEN`, `SKIPPED`, `OVERDUE`, `DUE` (en ventana), `UPCOMING`. |
| F6 | Registro de tomas | Marcar dada u omitida (con motivo). Guarda hora y responsable. Descuenta stock. Se puede deshacer. |
| F7 | Historial | Tomas registradas en un rango de fechas, con hora, responsable y notas. |
| F8 | Stock | Reposición manual y ajuste; cada movimiento queda registrado. |
| F9 | Recetas / órdenes | Fecha de vencimiento asociada (o no) a un medicamento. |
| F10 | Avisos en panel | Stock bajo (umbral o días de cobertura) y recetas vencidas o por vencer. |

### Fuera del MVP (backlog)

- Notificaciones push, email o WhatsApp (los avisos se ven en el panel).
- Medicación "si es necesario" (SOS) fuera de horario.
- Varias personas cuidadas por grupo, adjuntar foto de la receta.
- Tiempo real por WebSocket (el front consulta cada 30 s; alcanza para la demo).
- Recuperación de contraseña, refresh tokens, verificación de email.

## 3. Historias de usuario y criterios de aceptación

1. **Como administrador**, creo el grupo "Abuela Marta" e invito a mi hermana como cuidadora.
   - El enlace vence a los 7 días y sirve una sola vez.
   - Si la invitación tiene email, solo lo acepta una cuenta con ese email.
2. **Como administrador**, cargo "Enalapril 10 mg, 1 comprimido, 08:00 y 20:00, todos los días, stock 30, aviso con 6".
3. **Como cuidadora que entra al turno**, abro el día y veo: la de las 08:00 dada por Lucas a las 08:12,
   la de las 14:00 atrasada, la de las 20:00 pendiente.
4. **Como cuidadora**, marco la toma de las 14:00 como dada. El stock baja de 30 a 29.
5. **Como segundo cuidador**, intento marcar la misma toma: recibo `409` con "ya registrada por Ana a las 14:31".
6. **Como cualquier miembro**, veo en el panel "Enalapril: quedan 5 comprimidos (≈ 2 días)" y
   "Receta de Enalapril vence en 3 días".
7. **Como observador (`VIEWER`)**, veo todo pero no puedo registrar ni editar.
8. **Como usuario ajeno al grupo**, cualquier pedido a ese grupo devuelve `404` (no se revela que existe).

## 4. Reparto de trabajo (propuesta)

| Bloque | Persona A (backend) | Persona B (frontend) |
|---|---|---|
| 0–4 h | Monorepo, Prisma, auth, grupos | Next.js, layout, login/registro contra la API |
| 4–14 h | Medicamentos, horarios, vista del día, registro de tomas | Vista del día (pantalla principal), registrar/deshacer |
| 14–24 h | Stock, recetas, avisos, tests e2e | Plan de medicación (ABM), invitaciones |
| 24–36 h | Seed de demo, deploy Render + Neon/Render PG | Avisos, historial, diseño, mobile |
| 36–48 h | Bugs, ensayo de demo | Pulido visual, ensayo de demo |

El contrato entre ambos es la API documentada en Swagger (`/docs`) y en [ARQUITECTURA.md](./ARQUITECTURA.md).

## 5. Guion de la demo (3 minutos)

1. Login como Lucas (admin) → panel del grupo "Marta" con avisos.
2. Vista del día: una dada, una atrasada (roja), dos pendientes.
3. En otra ventana, Ana (cuidadora) marca la atrasada como dada.
4. Lucas refresca: la ve con "Ana · 14:31". Intenta marcarla → mensaje de conflicto.
5. Stock bajo de Enalapril → Lucas repone 30 → el aviso desaparece.
6. Historial del día con responsables.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Zonas horarias (servidor en UTC, usuarios en Argentina) | Zona horaria por grupo; cálculo con Luxon; tests de la vista del día. |
| Condición de carrera al registrar la misma toma | Restricción `UNIQUE (scheduleId, scheduledFor)` en la base, no solo validación en código. |
| Render "duerme" el servicio gratuito | Despertar la API antes de la demo; tener seed listo. |
| Alcance | Todo lo del backlog queda afuera hasta tener la demo completa. |
