import { Controller, Get, Injectable, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { todayInZone } from '../common/dates';
import { GroupAccessGuard } from '../groups/group-access.guard';
import { PrismaService } from '../prisma/prisma.service';
import { buildPlanSheet } from './plan-sheet';

@Injectable()
export class PlanSheetService {
  constructor(private readonly prisma: PrismaService) {}

  async get(groupId: string) {
    const group = await this.prisma.careGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { name: true, patientName: true, notes: true, timezone: true },
    });
    const [medications, prescriptions] = await Promise.all([
      this.prisma.medication.findMany({
        where: { groupId, active: true },
        include: { schedules: { where: { active: true } } },
      }),
      this.prisma.prescription.findMany({
        where: { groupId },
        include: { medication: { select: { name: true, strength: true } } },
      }),
    ]);
    return buildPlanSheet({ today: todayInZone(group.timezone), group, medications, prescriptions });
  }
}

@ApiTags('medications')
@ApiBearerAuth()
@Controller('groups/:groupId/plan-sheet')
@UseGuards(GroupAccessGuard)
export class PlanSheetController {
  constructor(private readonly sheet: PlanSheetService) {}

  /** Plan vigente armado para imprimir: horarios agrupados por hora y recetas. */
  @Get()
  get(@Param('groupId') groupId: string) {
    return this.sheet.get(groupId);
  }
}
