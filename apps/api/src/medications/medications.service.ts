import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType, type Medication, type Schedule } from '@prisma/client';
import { dateOnlyToIso, isoToDateOnly, todayInZone } from '../common/dates';
import { averageDailyUnits, isInEffect } from '../doses/occurrences';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMedicationDto,
  CreateScheduleDto,
  StockMovementDto,
  UpdateMedicationDto,
  UpdateScheduleDto,
} from './medications.dto';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(groupId: string, includeInactive = false) {
    const [zone, medications] = await Promise.all([
      this.groupZone(groupId),
      this.prisma.medication.findMany({
        where: { groupId, ...(includeInactive ? {} : { active: true }) },
        include: { schedules: { orderBy: { timeOfDay: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
    ]);
    const today = todayInZone(zone);
    return medications.map((m) => present(m, today, includeInactive));
  }

  async get(groupId: string, medicationId: string) {
    const [zone, medication] = await Promise.all([
      this.groupZone(groupId),
      this.findMedication(groupId, medicationId, { schedules: { orderBy: { timeOfDay: 'asc' } } }),
    ]);
    return present(medication, todayInZone(zone), true);
  }

  async create(groupId: string, userId: string, dto: CreateMedicationDto) {
    const zone = await this.groupZone(groupId);
    const { schedules = [], ...data } = dto;
    const scheduleData = schedules.map((s) => scheduleCreateData(s, zone));

    const medication = await this.prisma.$transaction(async (tx) => {
      const created = await tx.medication.create({
        data: { ...data, groupId, schedules: { create: scheduleData } },
      });
      if (created.stock > 0) {
        await tx.stockMovement.create({
          data: {
            medicationId: created.id,
            type: StockMovementType.ADJUSTMENT,
            delta: created.stock,
            stockAfter: created.stock,
            note: 'Stock inicial',
            createdById: userId,
          },
        });
      }
      return created;
    });
    return this.get(groupId, medication.id);
  }

  async update(groupId: string, medicationId: string, dto: UpdateMedicationDto) {
    await this.findMedication(groupId, medicationId);
    await this.prisma.medication.update({ where: { id: medicationId }, data: dto });
    return this.get(groupId, medicationId);
  }

  /** Archiva: conserva el historial de tomas y movimientos. */
  async archive(groupId: string, medicationId: string) {
    await this.findMedication(groupId, medicationId);
    await this.prisma.medication.update({ where: { id: medicationId }, data: { active: false } });
  }

  async addSchedule(groupId: string, medicationId: string, dto: CreateScheduleDto) {
    const zone = await this.groupZone(groupId);
    await this.findMedication(groupId, medicationId);
    return this.prisma.schedule.create({
      data: { ...scheduleCreateData(dto, zone), medicationId },
    });
  }

  async updateSchedule(
    groupId: string,
    medicationId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ) {
    const schedule = await this.findSchedule(groupId, medicationId, scheduleId);
    const data: Prisma.ScheduleUpdateInput = {
      timeOfDay: dto.timeOfDay,
      daysOfWeek: dto.daysOfWeek,
      unitsPerDose: dto.unitsPerDose,
      startDate: dto.startDate ? isoToDateOnly(dto.startDate) : undefined,
      endDate: dto.endDate === undefined ? undefined : dto.endDate && isoToDateOnly(dto.endDate),
    };
    assertDateRange(
      dto.startDate ?? dateOnlyToIso(schedule.startDate),
      dto.endDate === undefined
        ? schedule.endDate && dateOnlyToIso(schedule.endDate)
        : dto.endDate,
    );
    return this.prisma.schedule.update({ where: { id: scheduleId }, data });
  }

  async deactivateSchedule(groupId: string, medicationId: string, scheduleId: string) {
    await this.findSchedule(groupId, medicationId, scheduleId);
    await this.prisma.schedule.update({ where: { id: scheduleId }, data: { active: false } });
  }

  async moveStock(groupId: string, medicationId: string, userId: string, dto: StockMovementDto) {
    await this.findMedication(groupId, medicationId);
    if (dto.type === 'RESTOCK' && dto.quantity <= 0) {
      throw new BadRequestException('La reposición debe ser mayor a cero');
    }

    return this.prisma.$transaction(async (tx) => {
      let delta: number;
      let updated: Medication;
      if (dto.type === 'RESTOCK') {
        delta = dto.quantity;
        updated = await tx.medication.update({
          where: { id: medicationId },
          data: { stock: { increment: dto.quantity } },
        });
      } else {
        const current = await tx.medication.findUniqueOrThrow({ where: { id: medicationId } });
        delta = dto.quantity - current.stock;
        updated = await tx.medication.update({
          where: { id: medicationId },
          data: { stock: dto.quantity },
        });
      }
      const movement = await tx.stockMovement.create({
        data: {
          medicationId,
          type: dto.type,
          delta,
          stockAfter: updated.stock,
          note: dto.note,
          createdById: userId,
        },
      });
      return { stock: updated.stock, movement };
    });
  }

  async listStockMovements(groupId: string, medicationId: string) {
    await this.findMedication(groupId, medicationId);
    return this.prisma.stockMovement.findMany({
      where: { medicationId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async groupZone(groupId: string) {
    const group = await this.prisma.careGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { timezone: true },
    });
    return group.timezone;
  }

  private async findMedication<I extends Prisma.MedicationInclude>(
    groupId: string,
    medicationId: string,
    include?: I,
  ) {
    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId, groupId },
      include,
    });
    if (!medication) throw new NotFoundException('Medicamento no encontrado');
    return medication as Prisma.MedicationGetPayload<{ include: I }>;
  }

  private async findSchedule(groupId: string, medicationId: string, scheduleId: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, medicationId, medication: { groupId } },
    });
    if (!schedule) throw new NotFoundException('Horario no encontrado');
    return schedule;
  }
}

function scheduleCreateData(dto: CreateScheduleDto, zone: string) {
  const startDate = dto.startDate ?? todayInZone(zone);
  assertDateRange(startDate, dto.endDate);
  return {
    timeOfDay: dto.timeOfDay,
    daysOfWeek: dto.daysOfWeek ?? [],
    unitsPerDose: dto.unitsPerDose ?? 1,
    startDate: isoToDateOnly(startDate),
    endDate: dto.endDate ? isoToDateOnly(dto.endDate) : null,
  };
}

function assertDateRange(startIso: string, endIso?: string | null) {
  if (endIso && endIso < startIso) {
    throw new BadRequestException('endDate no puede ser anterior a startDate');
  }
}

/** Agrega consumo diario estimado y días de cobertura del stock actual. */
export function present(
  medication: Medication & { schedules: Schedule[] },
  todayIso: string,
  includeInactiveSchedules: boolean,
) {
  const dailyUnits = medication.active ? dailyConsumption(medication.schedules, todayIso) : 0;
  return {
    ...medication,
    schedules: includeInactiveSchedules
      ? medication.schedules
      : medication.schedules.filter((s) => s.active),
    dailyUnits,
    coverageDays: dailyUnits > 0 ? Math.max(0, medication.stock) / dailyUnits : null,
  };
}

export function dailyConsumption(schedules: Schedule[], todayIso: string) {
  return schedules
    .filter((s) => s.active && isInEffect(s, todayIso))
    .reduce((sum, s) => sum + averageDailyUnits(s), 0);
}
