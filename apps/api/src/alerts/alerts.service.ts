import { Injectable } from '@nestjs/common';
import { dateOnlyToIso, todayInZone } from '../common/dates';
import { dailyConsumption } from '../medications/medications.service';
import { PrismaService } from '../prisma/prisma.service';
import { Alert, prescriptionAlert, stockAlert } from './alerts.calc';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(groupId: string) {
    const group = await this.prisma.careGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { timezone: true },
    });
    const today = todayInZone(group.timezone);

    const [medications, prescriptions] = await Promise.all([
      this.prisma.medication.findMany({
        where: { groupId, active: true },
        include: { schedules: true },
      }),
      this.prisma.prescription.findMany({ where: { groupId } }),
    ]);

    const alerts: Alert[] = [];
    for (const m of medications) {
      const alert = stockAlert({ ...m, dailyUnits: dailyConsumption(m.schedules, today) });
      if (alert) alerts.push(alert);
    }
    for (const p of prescriptions) {
      const alert = prescriptionAlert({ ...p, expiresAtIso: dateOnlyToIso(p.expiresAt) }, today);
      if (alert) alerts.push(alert);
    }

    alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
    return { date: today, alerts };
  }
}
