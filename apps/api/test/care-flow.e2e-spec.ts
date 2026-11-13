import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

const ZONE = 'America/Argentina/Buenos_Aires';

describe('Flujo de cuidado (e2e)', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;

  const tokens: Record<'admin' | 'caregiver' | 'family' | 'outsider', string> = {} as never;
  let groupId: string;
  let medicationId: string;
  let scheduleId: string;
  let scheduledFor: string;

  const as = (who: keyof typeof tokens) => ({ Authorization: `Bearer ${tokens[who]}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    api = request(app.getHttpServer());

    for (const who of Object.keys({ admin: 1, caregiver: 1, family: 1, outsider: 1 })) {
      const res = await api
        .post('/api/auth/register')
        .send({ email: `${who}-${randomUUID()}@example.com`, password: 'secreto123', name: who })
        .expect(201);
      tokens[who as keyof typeof tokens] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza pedidos sin token', async () => {
    await api.get('/api/groups').expect(401);
  });

  it('crea el grupo e incorpora miembros por invitación', async () => {
    const group = await api
      .post('/api/groups')
      .set(as('admin'))
      .send({ name: 'Cuidado de Marta', patientName: 'Marta', timezone: ZONE })
      .expect(201);
    groupId = group.body.id;
    expect(group.body.myRole).toBe('ADMIN');

    const caregiverEmail = (await api.get('/api/auth/me').set(as('caregiver'))).body.email;
    const forCaregiver = await api
      .post(`/api/groups/${groupId}/invitations`)
      .set(as('admin'))
      .send({ email: caregiverEmail, role: 'CAREGIVER' })
      .expect(201);
    // El rol observador ya no existe (#26).
    await api.post(`/api/groups/${groupId}/invitations`).set(as('admin')).send({ role: 'VIEWER' }).expect(400);
    const forFamily = await api
      .post(`/api/groups/${groupId}/invitations`)
      .set(as('admin'))
      .send({ role: 'CAREGIVER' })
      .expect(201);

    // Una invitación con email no la puede usar otra cuenta.
    await api.post(`/api/invitations/${forCaregiver.body.token}/accept`).set(as('outsider')).expect(403);

    const preview = await api.get(`/api/invitations/${forCaregiver.body.token}`).expect(200);
    expect(preview.body.group.name).toBe('Cuidado de Marta');

    await api.post(`/api/invitations/${forCaregiver.body.token}/accept`).set(as('caregiver')).expect(200);
    await api.post(`/api/invitations/${forFamily.body.token}/accept`).set(as('family')).expect(200);
    // Las invitaciones son de un solo uso.
    await api.post(`/api/invitations/${forFamily.body.token}/accept`).set(as('outsider')).expect(410);

    const members = await api.get(`/api/groups/${groupId}/members`).set(as('family')).expect(200);
    expect(members.body.map((m: { role: string }) => m.role).sort()).toEqual(['ADMIN', 'CAREGIVER', 'CAREGIVER']);
    const familyId = (await api.get('/api/auth/me').set(as('family'))).body.id;
    await api
      .patch(`/api/groups/${groupId}/members/${familyId}`)
      .set(as('admin'))
      .send({ role: 'VIEWER' })
      .expect(400);
  });

  it('oculta el grupo a quien no es miembro', async () => {
    await api.get(`/api/groups/${groupId}`).set(as('outsider')).expect(404);
    await api.get(`/api/groups/${groupId}/day`).set(as('outsider')).expect(404);
    await api.get(`/api/groups/${randomUUID()}/day`).set(as('admin')).expect(404);
  });

  it('guarda los datos de la persona cuidada y del médico; solo el ADMIN los edita', async () => {
    const data = {
      patientBirthDate: '1946-05-21',
      patientAllergies: 'Penicilina',
      doctorName: 'Dra. Pérez',
      doctorPhone: '+54 2983 41-2233',
      doctorEmail: 'Perez@Example.com',
    };
    await api.patch(`/api/groups/${groupId}`).set(as('caregiver')).send(data).expect(403);
    await api
      .patch(`/api/groups/${groupId}`)
      .set(as('admin'))
      .send({ patientBirthDate: '21/05/1946' })
      .expect(400);
    await api.patch(`/api/groups/${groupId}`).set(as('admin')).send({ doctorPhone: 'llamar' }).expect(400);

    await api.patch(`/api/groups/${groupId}`).set(as('admin')).send(data).expect(200);
    const seen = await api.get(`/api/groups/${groupId}`).set(as('caregiver')).expect(200);
    expect(seen.body).toMatchObject({ ...data, doctorEmail: 'perez@example.com', myRole: 'CAREGIVER' });

    // null borra el dato.
    const cleared = await api
      .patch(`/api/groups/${groupId}`)
      .set(as('admin'))
      .send({ patientBirthDate: null, doctorEmail: null })
      .expect(200);
    expect(cleared.body).toMatchObject({ patientBirthDate: null, doctorEmail: null, doctorName: 'Dra. Pérez' });
  });

  it('solo el ADMIN edita el plan de medicación', async () => {
    // Toma programada hace 10 minutos, para que esté "para dar".
    const slot = DateTime.now().setZone(ZONE).minus({ minutes: 10 }).startOf('minute');
    const body = {
      name: 'Enalapril',
      strength: '10 mg',
      form: 'comprimidos',
      stock: 7,
      lowStockThreshold: 6,
      schedules: [
        {
          timeOfDay: slot.toFormat('HH:mm'),
          startDate: slot.minus({ days: 1 }).toISODate(),
          unitsPerDose: 1,
        },
      ],
    };
    await api.post(`/api/groups/${groupId}/medications`).set(as('caregiver')).send(body).expect(403);

    const created = await api
      .post(`/api/groups/${groupId}/medications`)
      .set(as('admin'))
      .send(body)
      .expect(201);
    medicationId = created.body.id;
    scheduleId = created.body.schedules[0].id;
    scheduledFor = slot.toUTC().toISO()!;
    expect(created.body.dailyUnits).toBe(1);
  });

  it('muestra la toma en la vista del día', async () => {
    const date = DateTime.fromISO(scheduledFor).setZone(ZONE).toISODate();
    const day = await api.get(`/api/groups/${groupId}/day?date=${date}`).set(as('family')).expect(200);
    const dose = day.body.doses.find((d: { scheduleId: string }) => d.scheduleId === scheduleId);
    expect(dose.status).toBe('DUE');
    expect(new Date(dose.scheduledFor).toISOString()).toBe(new Date(scheduledFor).toISOString());
  });

  it('arma el resumen del día para compartir, también para quien no administra', async () => {
    const slot = DateTime.fromISO(scheduledFor).setZone(ZONE);
    const res = await api
      .get(`/api/groups/${groupId}/day/summary?date=${slot.toISODate()}`)
      .set(as('family'))
      .expect(200);
    expect(res.body.date).toBe(slot.toISODate());
    expect(res.body.text).toContain('*MediControl · Marta*');
    expect(res.body.text).toContain(`*Toca ahora (1)*\n- ${slot.toFormat('HH:mm')} Enalapril 10 mg`);
    await api.get(`/api/groups/${groupId}/day/summary`).set(as('outsider')).expect(404);
  });

  it('arma la hoja del plan para imprimir, también para quien no administra', async () => {
    const time = DateTime.fromISO(scheduledFor).setZone(ZONE).toFormat('HH:mm');
    const res = await api.get(`/api/groups/${groupId}/plan-sheet`).set(as('family')).expect(200);
    expect(res.body.patientName).toBe('Marta');
    expect(res.body.slots).toContainEqual({
      time,
      items: [{ medication: 'Enalapril 10 mg', dose: '1 comprimido', instructions: null, days: 'Todos los días', period: null }],
    });
    await api.get(`/api/groups/${groupId}/plan-sheet`).set(as('outsider')).expect(404);
  });

  it('rechaza instantes que no son tomas programadas', async () => {
    const wrong = DateTime.fromISO(scheduledFor).plus({ minutes: 1 }).toISO();
    await api
      .post(`/api/groups/${groupId}/doses`)
      .set(as('caregiver'))
      .send({ scheduleId, scheduledFor: wrong, status: 'GIVEN' })
      .expect(400);
  });

  it('dos cuidadores registrando la misma toma a la vez: una sola gana', async () => {
    const send = (who: 'admin' | 'caregiver') =>
      api
        .post(`/api/groups/${groupId}/doses`)
        .set(as(who))
        .send({ scheduleId, scheduledFor, status: 'GIVEN' });

    const results = await Promise.all([send('admin'), send('caregiver'), send('caregiver')]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);

    const conflict = results.find((r) => r.status === 409)!;
    expect(conflict.body.message).toMatch(/ya fue registrada como dada por (admin|caregiver) a las \d\d:\d\d/);
    expect(conflict.body.existing.status).toBe('GIVEN');

    const medication = await api
      .get(`/api/groups/${groupId}/medications/${medicationId}`)
      .set(as('admin'))
      .expect(200);
    expect(medication.body.stock).toBe(6);
  });

  it('cuenta las tomas de cada día para el calendario', async () => {
    const slot = DateTime.fromISO(scheduledFor).setZone(ZONE);
    const from = slot.minus({ days: 2 }).toISODate()!;
    const to = slot.plus({ days: 1 }).toISODate()!;
    const res = await api.get(`/api/groups/${groupId}/days?from=${from}&to=${to}`).set(as('family')).expect(200);
    expect(res.body).toMatchObject({ from, to, timezone: ZONE });
    expect(res.body.days.map((d: { date: string }) => d.date)).toEqual([
      from,
      slot.minus({ days: 1 }).toISODate(),
      slot.toISODate(),
      to,
    ]);
    const [before, yesterday, today, tomorrow] = res.body.days;
    expect(before.total).toBe(0); // El horario todavía no había empezado.
    expect(yesterday).toMatchObject({ total: 1, OVERDUE: 1 });
    expect(today).toMatchObject({ total: 1, GIVEN: 1 });
    expect(tomorrow).toMatchObject({ total: 1, UPCOMING: 1 });

    await api.get(`/api/groups/${groupId}/days?from=${to}&to=${from}`).set(as('family')).expect(400);
    await api.get(`/api/groups/${groupId}/days?from=2026-01-01&to=2026-03-31`).set(as('family')).expect(400);
    await api.get(`/api/groups/${groupId}/days?from=${from}`).set(as('family')).expect(400);
    await api.get(`/api/groups/${groupId}/days?from=${from}&to=${to}`).set(as('outsider')).expect(404);
  });

  it('avisa stock bajo', async () => {
    const res = await api.get(`/api/groups/${groupId}/alerts`).set(as('family')).expect(200);
    expect(res.body.alerts).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'LOW_STOCK', medicationId })]),
    );
    // El plan marca el mismo medicamento con stock bajo.
    const list = await api.get(`/api/groups/${groupId}/medications`).set(as('family')).expect(200);
    expect(list.body.find((m: { id: string }) => m.id === medicationId).lowStock).toBe(true);
    // Y la vista del día muestra en la tarjeta cuánto queda.
    const day = await api.get(`/api/groups/${groupId}/day`).set(as('family')).expect(200);
    const dose = day.body.doses.find((d: { scheduleId: string }) => d.scheduleId === scheduleId);
    expect(dose.medication).toMatchObject({ stock: 6, lowStock: true });
  });

  it('lista medicamentos activos, archivados o todos', async () => {
    const created = await api
      .post(`/api/groups/${groupId}/medications`)
      .set(as('admin'))
      .send({ name: 'Para archivar' })
      .expect(201);
    await api.delete(`/api/groups/${groupId}/medications/${created.body.id}`).set(as('admin')).expect(204);

    const ids = async (query: string) =>
      (await api.get(`/api/groups/${groupId}/medications${query}`).set(as('family')).expect(200)).body.map(
        (m: { id: string }) => m.id,
      );
    expect(await ids('')).not.toContain(created.body.id);
    expect(await ids('?status=archived')).toEqual([created.body.id]);
    expect(await ids('?status=all')).toEqual(expect.arrayContaining([created.body.id, medicationId]));
    expect(await ids('?includeInactive=true')).toEqual(await ids('?status=all'));
    await api.get(`/api/groups/${groupId}/medications?status=otro`).set(as('family')).expect(400);
  });

  it('informa el estado de cada receta', async () => {
    const today = DateTime.now().setZone(ZONE);
    const create = (description: string, days: number) =>
      api
        .post(`/api/groups/${groupId}/prescriptions`)
        .set(as('admin'))
        .send({ description, expiresAt: today.plus({ days }).toISODate() })
        .expect(201);
    const expiring = await create('Por vencer', 3);
    expect(expiring.body).toMatchObject({ status: 'EXPIRING', daysLeft: 3 });
    await create('Vencida', -2);
    await create('Vigente', 40);

    const list = await api.get(`/api/groups/${groupId}/prescriptions`).set(as('family')).expect(200);
    expect(list.body.map((p: { description: string; status: string }) => [p.description, p.status])).toEqual([
      ['Vencida', 'EXPIRED'],
      ['Por vencer', 'EXPIRING'],
      ['Vigente', 'VALID'],
    ]);
  });

  it('impide usar un horario de otro grupo', async () => {
    const other = await api
      .post('/api/groups')
      .set(as('outsider'))
      .send({ name: 'Otro', patientName: 'Otra persona' })
      .expect(201);
    await api
      .post(`/api/groups/${other.body.id}/doses`)
      .set(as('outsider'))
      .send({ scheduleId, scheduledFor, status: 'GIVEN' })
      .expect(404);
    await api
      .get(`/api/groups/${other.body.id}/medications/${medicationId}`)
      .set(as('outsider'))
      .expect(404);
  });

  it('deshacer devuelve el stock, libera la toma y la deja en el historial', async () => {
    const day = await api.get(`/api/groups/${groupId}/day`).set(as('admin')).expect(200);
    const dose = day.body.doses.find((d: { scheduleId: string }) => d.scheduleId === scheduleId);
    const recordId = dose.record.id;

    await api.delete(`/api/groups/${groupId}/doses/${recordId}`).set(as('family')).expect(403);
    await api.delete(`/api/groups/${groupId}/doses/${recordId}`).set(as('admin')).expect(204);
    // Deshacer dos veces no devuelve el stock dos veces.
    await api.delete(`/api/groups/${groupId}/doses/${recordId}`).set(as('admin')).expect(409);

    const after = await api.get(`/api/groups/${groupId}/day`).set(as('admin')).expect(200);
    const freed = after.body.doses.find((d: { scheduleId: string }) => d.scheduleId === scheduleId);
    expect(freed.record).toBeNull();

    const medication = await api
      .get(`/api/groups/${groupId}/medications/${medicationId}`)
      .set(as('admin'))
      .expect(200);
    expect(medication.body.stock).toBe(7);

    const movements = await api
      .get(`/api/groups/${groupId}/medications/${medicationId}/stock-movements`)
      .set(as('admin'))
      .expect(200);
    expect(movements.body.map((m: { type: string }) => m.type)).toEqual([
      'DOSE_REVERTED',
      'DOSE',
      'ADJUSTMENT',
    ]);

    await api
      .post(`/api/groups/${groupId}/doses`)
      .set(as('caregiver'))
      .send({ scheduleId, scheduledFor, status: 'SKIPPED', notes: 'Estaba dormida' })
      .expect(201);

    // La toma deshecha sigue en el historial, con quién la deshizo; la nueva queda vigente.
    const history = await api.get(`/api/groups/${groupId}/doses`).set(as('family')).expect(200);
    const records = history.body.records as { id: string; status: string; notes: string | null; undoneAt: string | null; undoneBy: { name: string } | null }[];
    expect(records.find((r) => r.id === recordId)).toMatchObject({
      status: 'GIVEN',
      undoneBy: { name: 'admin' },
    });
    expect(records.find((r) => r.undoneAt === null)).toMatchObject({
      status: 'SKIPPED',
      notes: 'Estaba dormida',
      undoneBy: null,
    });

    const onlyUndone = await api.get(`/api/groups/${groupId}/doses?undone=true`).set(as('family')).expect(200);
    expect(onlyUndone.body.records.map((r: { id: string }) => r.id)).toEqual([recordId]);
  });

  it('filtra el historial por responsable y estado en la API', async () => {
    const caregiver = (await api.get('/api/auth/me').set(as('caregiver'))).body;
    const all = await api.get(`/api/groups/${groupId}/doses`).set(as('family')).expect(200);
    // La toma deshecha también cuenta: según quién ganó la carrera, admin puede aparecer.
    expect(all.body.recorders).toContainEqual({ id: caregiver.id, name: 'caregiver' });

    const skipped = await api
      .get(`/api/groups/${groupId}/doses?status=SKIPPED&recordedById=${caregiver.id}`)
      .set(as('family'))
      .expect(200);
    expect(skipped.body.records.length).toBeGreaterThan(0);
    expect(
      skipped.body.records.every(
        (r: { status: string; recordedBy: { id: string } }) =>
          r.status === 'SKIPPED' && r.recordedBy.id === caregiver.id,
      ),
    ).toBe(true);

    // La única toma dada se deshizo: entre las vigentes no queda ninguna dada.
    const given = await api
      .get(`/api/groups/${groupId}/doses?status=GIVEN&undone=false`)
      .set(as('family'))
      .expect(200);
    expect(given.body.records).toEqual([]);
    // Los responsables del período no dependen de los otros filtros.
    expect(given.body.recorders).toEqual(all.body.recorders);

    await api.get(`/api/groups/${groupId}/doses?status=OTRO`).set(as('family')).expect(400);
    await api.get(`/api/groups/${groupId}/doses?recordedById=no-es-uuid`).set(as('family')).expect(400);
  });

  it('el grupo no puede quedarse sin administrador', async () => {
    const me = await api.get('/api/auth/me').set(as('admin'));
    await api
      .patch(`/api/groups/${groupId}/members/${me.body.id}`)
      .set(as('admin'))
      .send({ role: 'CAREGIVER' })
      .expect(400);
  });

  it('cada uno edita su cuenta: nombre, email y contraseña', async () => {
    const caregiver = (await api.get('/api/auth/me').set(as('caregiver'))).body;
    const taken = (await api.get('/api/auth/me').set(as('admin'))).body.email;
    const newEmail = `cuidadora-${randomUUID()}@example.com`;

    // El nombre nuevo se ve en el historial sin reescribir registros.
    await api.patch('/api/auth/me').set(as('caregiver')).send({ name: '  Ana María ' }).expect(200);
    const history = await api.get(`/api/groups/${groupId}/doses`).set(as('admin')).expect(200);
    expect(history.body.recorders).toContainEqual({ id: caregiver.id, name: 'Ana María' });

    // Cambiar el email pide la contraseña actual; 400 (no 401) para no cerrar la sesión.
    await api.patch('/api/auth/me').set(as('caregiver')).send({ email: newEmail }).expect(400);
    await api
      .patch('/api/auth/me')
      .set(as('caregiver'))
      .send({ email: newEmail, currentPassword: 'otra-cosa' })
      .expect(400);
    await api
      .patch('/api/auth/me')
      .set(as('caregiver'))
      .send({ email: taken, currentPassword: 'secreto123' })
      .expect(409);
    const updated = await api
      .patch('/api/auth/me')
      .set(as('caregiver'))
      .send({ email: newEmail.toUpperCase(), currentPassword: 'secreto123' })
      .expect(200);
    expect(updated.body).toEqual({ id: caregiver.id, email: newEmail, name: 'Ana María' });

    await api
      .patch('/api/auth/me/password')
      .set(as('caregiver'))
      .send({ currentPassword: 'mal', newPassword: 'nueva-clave-1' })
      .expect(400);
    await api
      .patch('/api/auth/me/password')
      .set(as('caregiver'))
      .send({ currentPassword: 'secreto123', newPassword: 'corta' })
      .expect(400);
    await api
      .patch('/api/auth/me/password')
      .set(as('caregiver'))
      .send({ currentPassword: 'secreto123', newPassword: 'nueva-clave-1' })
      .expect(204);
    await api.post('/api/auth/login').send({ email: newEmail, password: 'secreto123' }).expect(401);
    await api.post('/api/auth/login').send({ email: newEmail, password: 'nueva-clave-1' }).expect(200);
  });
});
