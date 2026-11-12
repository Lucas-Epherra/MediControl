import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prescription, Prisma } from '@prisma/client';
import { prescriptionStatus } from '../alerts/alerts.calc';
import { dateOnlyToIso, isoToDateOnly, todayInZone } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from './prescriptions.dto';

const include = {
  medication: { select: { id: true, name: true, strength: true } },
} satisfies Prisma.PrescriptionInclude;

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(groupId: string) {
    const [today, prescriptions] = await Promise.all([
      this.today(groupId),
      this.prisma.prescription.findMany({ where: { groupId }, include, orderBy: { expiresAt: 'asc' } }),
    ]);
    return prescriptions.map((p) => present(p, today));
  }

  async create(groupId: string, dto: CreatePrescriptionDto) {
    await this.assertMedicationInGroup(groupId, dto.medicationId);
    this.assertDates(dto.issuedAt, dto.expiresAt);
    const created = await this.prisma.prescription.create({
      data: {
        groupId,
        description: dto.description,
        medicationId: dto.medicationId ?? null,
        issuedAt: dto.issuedAt ? isoToDateOnly(dto.issuedAt) : null,
        expiresAt: isoToDateOnly(dto.expiresAt),
        notes: dto.notes,
      },
      include,
    });
    return present(created, await this.today(groupId));
  }

  async update(groupId: string, prescriptionId: string, dto: UpdatePrescriptionDto) {
    await this.find(groupId, prescriptionId);
    await this.assertMedicationInGroup(groupId, dto.medicationId);
    this.assertDates(dto.issuedAt, dto.expiresAt);
    const updated = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        description: dto.description,
        medicationId: dto.medicationId,
        issuedAt: dto.issuedAt === undefined ? undefined : dto.issuedAt && isoToDateOnly(dto.issuedAt),
        expiresAt: dto.expiresAt ? isoToDateOnly(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
      include,
    });
    return present(updated, await this.today(groupId));
  }

  async remove(groupId: string, prescriptionId: string) {
    await this.find(groupId, prescriptionId);
    await this.prisma.prescription.delete({ where: { id: prescriptionId } });
  }

  private async today(groupId: string) {
    const group = await this.prisma.careGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { timezone: true },
    });
    return todayInZone(group.timezone);
  }

  private async find(groupId: string, prescriptionId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, groupId },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada');
    return prescription;
  }

  private async assertMedicationInGroup(groupId: string, medicationId?: string | null) {
    if (!medicationId) return;
    const exists = await this.prisma.medication.count({ where: { id: medicationId, groupId } });
    if (!exists) throw new BadRequestException('El medicamento no pertenece al grupo');
  }

  private assertDates(issuedAt?: string | null, expiresAt?: string) {
    if (issuedAt && expiresAt && expiresAt < issuedAt) {
      throw new BadRequestException('expiresAt no puede ser anterior a issuedAt');
    }
  }
}

/** Suma el estado (vigente, por vencer o vencida) con el mismo criterio que los avisos. */
function present<T extends Prescription>(prescription: T, todayIso: string) {
  return { ...prescription, ...prescriptionStatus(dateOnlyToIso(prescription.expiresAt), todayIso) };
}
