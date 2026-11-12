import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DoseStatus,
  GroupRole,
  Prisma,
  StockMovementType,
  type Membership,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { dayBounds, formatTimeInZone, todayInZone } from '../common/dates';
import { isUniqueViolation } from '../common/prisma-exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { DoseSlotStatus, isTooEarlyToRecord, slotStatus, UNDO_WINDOW_HOURS } from './dose-status';
import { HistoryQuery, RecordDoseDto } from './doses.dto';
import { isOccurrence, occurrenceInstant, occursOn } from './occurrences';

const MAX_HISTORY_DAYS = 92;

const recordInclude = {
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.DoseRecordInclude;

type RecordWithUser = Prisma.DoseRecordGetPayload<{ include: typeof recordInclude }>;

const medicationSelect = {
  id: true,
  name: true,
  strength: true,
  form: true,
  instructions: true,
} satisfies Prisma.MedicationSelect;

@Injectable()
export class DosesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tomas programadas del día local con su estado, cruzadas con lo registrado. */
  async day(groupId: string, date?: string) {
    const zone = await this.groupZone(groupId);
    const isoDate = date ?? todayInZone(zone);
    if (!DateTime.fromISO(isoDate).isValid) throw new BadRequestException('Fecha inválida');
    const { start, end } = dayBounds(isoDate, zone);
    const now = new Date();

    const [schedules, records] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { active: true, medication: { groupId, active: true } },
        include: { medication: { select: medicationSelect } },
      }),
      this.prisma.doseRecord.findMany({
        where: { groupId, scheduledFor: { gte: start, lt: end } },
        include: {
          ...recordInclude,
          medication: { select: medicationSelect },
          schedule: { select: { timeOfDay: true, unitsPerDose: true } },
        },
      }),
    ]);

    const recordsByKey = new Map(records.map((r) => [slotKey(r.scheduleId, r.scheduledFor), r]));
    const doses: DaySlot[] = [];

    for (const schedule of schedules) {
      if (!occursOn(schedule, isoDate)) continue;
      const scheduledFor = occurrenceInstant(schedule.timeOfDay, isoDate, zone);
      const key = slotKey(schedule.id, scheduledFor);
      const record = recordsByKey.get(key);
      recordsByKey.delete(key);
      doses.push({
        key,
        scheduleId: schedule.id,
        scheduledFor,
        timeOfDay: schedule.timeOfDay,
        unitsPerDose: schedule.unitsPerDose,
        medication: schedule.medication,
        status: slotStatus(scheduledFor, now, record),
        record: record ? presentRecord(record) : null,
      });
    }

    // Registros cuyo horario cambió o se desactivó: se siguen mostrando.
    for (const [key, record] of recordsByKey) {
      doses.push({
        key,
        scheduleId: record.scheduleId,
        scheduledFor: record.scheduledFor,
        timeOfDay: formatTimeInZone(record.scheduledFor, zone),
        unitsPerDose: record.schedule.unitsPerDose,
        medication: record.medication,
        status: record.status,
        record: presentRecord(record),
      });
    }

    doses.sort(
      (a, b) =>
        a.scheduledFor.getTime() - b.scheduledFor.getTime() ||
        a.medication.name.localeCompare(b.medication.name),
    );

    const summary = { total: doses.length, GIVEN: 0, SKIPPED: 0, OVERDUE: 0, DUE: 0, UPCOMING: 0 };
    for (const dose of doses) summary[dose.status]++;

    return { date: isoDate, timezone: zone, now, summary, doses };
  }

  async record(groupId: string, userId: string, dto: RecordDoseDto) {
    const zone = await this.groupZone(groupId);
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: dto.scheduleId, medication: { groupId } },
      include: { medication: true },
    });
    if (!schedule) throw new NotFoundException('Horario no encontrado');
    if (!schedule.active || !schedule.medication.active) {
      throw new BadRequestException('El horario o el medicamento no están activos');
    }

    const scheduledFor = new Date(dto.scheduledFor);
    if (!isOccurrence(schedule, scheduledFor, zone)) {
      throw new BadRequestException('La hora no corresponde a una toma programada de este horario');
    }
    if (isTooEarlyToRecord(scheduledFor, new Date())) {
      throw new BadRequestException('Todavía es temprano para registrar esta toma');
    }

    const unitsGiven = dto.status === DoseStatus.GIVEN ? schedule.unitsPerDose : 0;

    try {
      // Registro y descuento de stock son atómicos: si la toma ya existe, el stock no cambia.
      return await this.prisma.$transaction(async (tx) => {
        const record = await tx.doseRecord.create({
          data: {
            groupId,
            medicationId: schedule.medicationId,
            scheduleId: schedule.id,
            scheduledFor,
            status: dto.status,
            unitsGiven,
            notes: dto.notes,
            recordedById: userId,
          },
          include: recordInclude,
        });
        let stock = schedule.medication.stock;
        if (unitsGiven > 0) {
          const medication = await tx.medication.update({
            where: { id: schedule.medicationId },
            data: { stock: { decrement: unitsGiven } },
          });
          stock = medication.stock;
          await tx.stockMovement.create({
            data: {
              medicationId: schedule.medicationId,
              type: StockMovementType.DOSE,
              delta: -unitsGiven,
              stockAfter: stock,
              doseRecordId: record.id,
              createdById: userId,
            },
          });
        }
        return { ...presentRecord(record), stock };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw await this.duplicateConflict(schedule.id, scheduledFor, zone);
      }
      throw error;
    }
  }

  /** Quien registró puede deshacer dentro de la ventana; un ADMIN siempre. */
  async undo(groupId: string, actor: Membership, doseId: string) {
    const record = await this.prisma.doseRecord.findFirst({ where: { id: doseId, groupId } });
    if (!record) throw new NotFoundException('Registro no encontrado');

    if (actor.role !== GroupRole.ADMIN) {
      if (record.recordedById !== actor.userId) {
        throw new ForbiddenException('Solo quien registró la toma o un administrador puede deshacerla');
      }
      const ageHours = (Date.now() - record.recordedAt.getTime()) / 3_600_000;
      if (ageHours > UNDO_WINDOW_HOURS) {
        throw new ForbiddenException(
          `Pasaron más de ${UNDO_WINDOW_HOURS} h; pedile a un administrador que la corrija`,
        );
      }
    }

    const zone = await this.groupZone(groupId);
    await this.prisma.$transaction(async (tx) => {
      // deleteMany con id evita restaurar stock dos veces si se deshace en paralelo.
      const { count } = await tx.doseRecord.deleteMany({ where: { id: record.id } });
      if (count === 0 || record.unitsGiven <= 0) return;
      const medication = await tx.medication.update({
        where: { id: record.medicationId },
        data: { stock: { increment: record.unitsGiven } },
      });
      await tx.stockMovement.create({
        data: {
          medicationId: record.medicationId,
          type: StockMovementType.DOSE_REVERTED,
          delta: record.unitsGiven,
          stockAfter: medication.stock,
          note: `Se deshizo la toma de las ${formatTimeInZone(record.scheduledFor, zone)}`,
          createdById: actor.userId,
        },
      });
    });
  }

  async history(groupId: string, { from, to, medicationId, recordedById, status }: HistoryQuery) {
    const zone = await this.groupZone(groupId);
    const toIso = to ?? todayInZone(zone);
    const fromIso =
      from ?? DateTime.fromISO(toIso, { zone }).minus({ days: 7 }).toISODate()!;
    if (fromIso > toIso) throw new BadRequestException('from no puede ser posterior a to');
    const span = DateTime.fromISO(toIso).diff(DateTime.fromISO(fromIso), 'days').days;
    if (span > MAX_HISTORY_DAYS) {
      throw new BadRequestException(`El rango máximo es de ${MAX_HISTORY_DAYS} días`);
    }

    const scheduledFor = { gte: dayBounds(fromIso, zone).start, lt: dayBounds(toIso, zone).end };
    const [records, recorders] = await Promise.all([
      this.prisma.doseRecord.findMany({
        where: { groupId, medicationId, recordedById, status, scheduledFor },
        include: { ...recordInclude, medication: { select: medicationSelect } },
        orderBy: { scheduledFor: 'desc' },
        take: 1000,
      }),
      // Quiénes registraron en el período, sin los demás filtros: alimenta el filtro por responsable.
      this.prisma.doseRecord.findMany({
        where: { groupId, scheduledFor },
        distinct: ['recordedById'],
        select: { recordedBy: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      from: fromIso,
      to: toIso,
      timezone: zone,
      recorders: recorders.map((r) => r.recordedBy).sort((a, b) => a.name.localeCompare(b.name, 'es')),
      records: records.map((r) => ({ ...presentRecord(r), medication: r.medication })),
    };
  }

  private async duplicateConflict(scheduleId: string, scheduledFor: Date, zone: string) {
    const existing = await this.prisma.doseRecord.findUnique({
      where: { scheduleId_scheduledFor: { scheduleId, scheduledFor } },
      include: recordInclude,
    });
    if (!existing) return new ConflictException('Esta toma ya fue registrada');
    const action = existing.status === DoseStatus.GIVEN ? 'registrada como dada' : 'marcada como omitida';
    return new ConflictException({
      statusCode: 409,
      message: `Esta toma ya fue ${action} por ${existing.recordedBy.name} a las ${formatTimeInZone(existing.recordedAt, zone)}`,
      existing: presentRecord(existing),
    });
  }

  private async groupZone(groupId: string) {
    const group = await this.prisma.careGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { timezone: true },
    });
    return group.timezone;
  }
}

interface DaySlot {
  key: string;
  scheduleId: string;
  scheduledFor: Date;
  timeOfDay: string;
  unitsPerDose: number;
  medication: Prisma.MedicationGetPayload<{ select: typeof medicationSelect }>;
  status: DoseSlotStatus;
  record: ReturnType<typeof presentRecord> | null;
}

function slotKey(scheduleId: string, scheduledFor: Date) {
  return `${scheduleId}|${scheduledFor.toISOString()}`;
}

function presentRecord(record: RecordWithUser) {
  return {
    id: record.id,
    scheduleId: record.scheduleId,
    scheduledFor: record.scheduledFor,
    status: record.status,
    unitsGiven: record.unitsGiven,
    notes: record.notes,
    recordedAt: record.recordedAt,
    recordedBy: record.recordedBy,
  };
}
