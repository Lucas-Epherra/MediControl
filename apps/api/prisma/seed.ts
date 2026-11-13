import { DoseStatus, GroupRole, PrismaClient, StockMovementType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { isoToDateOnly } from '../src/common/dates';
import { OVERDUE_AFTER_MIN } from '../src/doses/dose-status';
import { occurrenceInstant, occursOn } from '../src/doses/occurrences';

/**
 * Datos de demo. Las tomas se generan relativas al momento de ejecución:
 * ayer completo, hoy registradas hasta hace un rato y la última vencida queda atrasada.
 */
const prisma = new PrismaClient();
const ZONE = 'America/Argentina/Buenos_Aires';
const PASSWORD = 'demo1234';

const USERS = [
  { email: 'lucas@example.com', name: 'Lucas', role: GroupRole.ADMIN },
  { email: 'ana@example.com', name: 'Ana', role: GroupRole.CAREGIVER },
  { email: 'sofia@example.com', name: 'Sofía', role: GroupRole.VIEWER },
];

const MEDICATIONS = [
  {
    name: 'Enalapril',
    strength: '10 mg',
    form: 'comprimidos',
    instructions: 'Controlar presión antes de la toma de la noche.',
    stock: 5,
    lowStockThreshold: 6,
    schedules: [{ timeOfDay: '08:00' }, { timeOfDay: '20:00' }],
  },
  {
    name: 'Metformina',
    strength: '850 mg',
    form: 'comprimidos',
    instructions: 'Con las comidas.',
    stock: 52,
    lowStockThreshold: 10,
    schedules: [{ timeOfDay: '08:30' }, { timeOfDay: '13:00' }, { timeOfDay: '21:00' }],
  },
  {
    name: 'Levotiroxina',
    strength: '50 mcg',
    form: 'comprimidos',
    instructions: 'En ayunas, 30 minutos antes del desayuno.',
    stock: 24,
    lowStockThreshold: 7,
    schedules: [{ timeOfDay: '07:00' }],
  },
  {
    name: 'Vitamina D',
    strength: '100.000 UI',
    form: 'ampollas',
    instructions: 'Bebible, una vez por semana.',
    stock: 3,
    lowStockThreshold: 1,
    schedules: [{ timeOfDay: '10:00', daysOfWeek: [1] }],
  },
];

async function main() {
  const now = DateTime.now().setZone(ZONE);
  const today = now.toISODate()!;
  const yesterday = now.minus({ days: 1 }).toISODate()!;
  const startDate = isoToDateOnly(now.minus({ days: 30 }).toISODate()!);

  const emails = USERS.map((u) => u.email);
  await prisma.careGroup.deleteMany({
    where: { memberships: { some: { user: { email: { in: emails } } } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = await Promise.all(
    USERS.map((u) =>
      prisma.user.create({ data: { email: u.email, name: u.name, passwordHash } }),
    ),
  );
  const [lucas, ana] = users;

  const group = await prisma.careGroup.create({
    data: {
      name: 'Cuidado de Marta',
      patientName: 'Marta Gómez',
      patientBirthDate: new Date('1946-05-21T00:00:00Z'),
      patientAllergies: 'Penicilina',
      patientConditions: 'Hipertensión, diabetes tipo 2, hipotiroidismo.',
      notes: 'Usa audífono del lado derecho: hablarle de frente.',
      doctorName: 'Dra. Laura Pérez',
      doctorSpecialty: 'Clínica médica',
      doctorPhone: '2983 41-2233',
      doctorEmail: 'consultorio.perez@example.com',
      timezone: ZONE,
      memberships: {
        create: USERS.map((u, i) => ({ userId: users[i].id, role: u.role })),
      },
    },
  });

  for (const { schedules, ...data } of MEDICATIONS) {
    const medication = await prisma.medication.create({
      data: {
        ...data,
        groupId: group.id,
        schedules: { create: schedules.map((s) => ({ daysOfWeek: [], ...s, startDate })) },
        stockMovements: {
          create: {
            type: StockMovementType.ADJUSTMENT,
            delta: data.stock,
            stockAfter: data.stock,
            note: 'Stock inicial',
            createdById: lucas.id,
          },
        },
      },
      include: { schedules: true },
    });

    for (const schedule of medication.schedules) {
      for (const day of [yesterday, today]) {
        if (!occursOn(schedule, day)) continue;
        const scheduledFor = occurrenceInstant(schedule.timeOfDay, day, ZONE);
        const minutesAgo = now.diff(DateTime.fromJSDate(scheduledFor), 'minutes').minutes;
        // Hoy, la toma más reciente ya vencida queda sin registrar para mostrar "atrasada".
        const leaveOverdue = day === today && medication.name === 'Metformina' && schedule.timeOfDay === '13:00';
        if (minutesAgo < OVERDUE_AFTER_MIN + 30 || leaveOverdue) continue;

        const skipped = day === yesterday && medication.name === 'Metformina' && schedule.timeOfDay === '21:00';
        const recorder = schedule.timeOfDay < '14:00' ? lucas : ana;
        await prisma.doseRecord.create({
          data: {
            groupId: group.id,
            medicationId: medication.id,
            scheduleId: schedule.id,
            scheduledFor,
            status: skipped ? DoseStatus.SKIPPED : DoseStatus.GIVEN,
            unitsGiven: skipped ? 0 : schedule.unitsPerDose,
            notes: skipped ? 'No quiso cenar; se consultó con la médica.' : null,
            recordedById: recorder.id,
            recordedAt: DateTime.fromJSDate(scheduledFor).plus({ minutes: 12 }).toJSDate(),
          },
        });
      }
    }
  }

  const enalapril = await prisma.medication.findFirstOrThrow({
    where: { groupId: group.id, name: 'Enalapril' },
  });
  await prisma.prescription.createMany({
    data: [
      {
        groupId: group.id,
        medicationId: enalapril.id,
        description: 'Receta Enalapril 10 mg x 60',
        issuedAt: isoToDateOnly(now.minus({ days: 27 }).toISODate()!),
        expiresAt: isoToDateOnly(now.plus({ days: 3 }).toISODate()!),
      },
      {
        groupId: group.id,
        description: 'Orden de análisis de sangre (hemoglobina glicosilada)',
        expiresAt: isoToDateOnly(now.plus({ days: 45 }).toISODate()!),
        notes: 'Turno en el laboratorio del hospital.',
      },
    ],
  });

  console.log(`Seed listo. Grupo "${group.name}" (${group.id}).`);
  console.log(`Usuarios (contraseña "${PASSWORD}"): ${USERS.map((u) => `${u.email} [${u.role}]`).join(', ')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
