import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { CurrentUser, GroupRoles } from '../common/decorators';
import type { AuthUser } from '../common/request-context';
import { GroupAccessGuard } from '../groups/group-access.guard';
import {
  CreateMedicationDto,
  CreateScheduleDto,
  ListMedicationsQuery,
  StockMovementDto,
  UpdateMedicationDto,
  UpdateScheduleDto,
} from './medications.dto';
import { MedicationsService } from './medications.service';

@ApiTags('medications')
@ApiBearerAuth()
@Controller('groups/:groupId/medications')
@UseGuards(GroupAccessGuard)
export class MedicationsController {
  constructor(private readonly medications: MedicationsService) {}

  @Get()
  list(@Param('groupId') groupId: string, @Query() query: ListMedicationsQuery) {
    return this.medications.list(groupId, query.status ?? (query.includeInactive ? 'all' : 'active'));
  }

  @Post()
  @GroupRoles(GroupRole.ADMIN)
  create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.medications.create(groupId, user.id, dto);
  }

  @Get(':medicationId')
  get(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
  ) {
    return this.medications.get(groupId, medicationId);
  }

  @Patch(':medicationId')
  @GroupRoles(GroupRole.ADMIN)
  update(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medications.update(groupId, medicationId, dto);
  }

  @Delete(':medicationId')
  @GroupRoles(GroupRole.ADMIN)
  @HttpCode(204)
  archive(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
  ) {
    return this.medications.archive(groupId, medicationId);
  }

  @Post(':medicationId/schedules')
  @GroupRoles(GroupRole.ADMIN)
  addSchedule(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.medications.addSchedule(groupId, medicationId, dto);
  }

  @Patch(':medicationId/schedules/:scheduleId')
  @GroupRoles(GroupRole.ADMIN)
  updateSchedule(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.medications.updateSchedule(groupId, medicationId, scheduleId, dto);
  }

  @Delete(':medicationId/schedules/:scheduleId')
  @GroupRoles(GroupRole.ADMIN)
  @HttpCode(204)
  deactivateSchedule(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
  ) {
    return this.medications.deactivateSchedule(groupId, medicationId, scheduleId);
  }

  @Post(':medicationId/stock')
  @GroupRoles(GroupRole.ADMIN, GroupRole.CAREGIVER)
  moveStock(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: StockMovementDto,
  ) {
    return this.medications.moveStock(groupId, medicationId, user.id, dto);
  }

  @Get(':medicationId/stock-movements')
  stockMovements(
    @Param('groupId') groupId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
  ) {
    return this.medications.listStockMovements(groupId, medicationId);
  }
}
