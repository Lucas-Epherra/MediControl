import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GroupRole, type Membership } from '@prisma/client';
import { CurrentMembership, CurrentUser, GroupRoles } from '../common/decorators';
import type { AuthUser } from '../common/request-context';
import { GroupAccessGuard } from '../groups/group-access.guard';
import { DayQuery, HistoryQuery, RecordDoseDto } from './doses.dto';
import { DosesService } from './doses.service';

@ApiTags('doses')
@ApiBearerAuth()
@Controller('groups/:groupId')
@UseGuards(GroupAccessGuard)
export class DosesController {
  constructor(private readonly doses: DosesService) {}

  @Get('day')
  day(@Param('groupId') groupId: string, @Query() query: DayQuery) {
    return this.doses.day(groupId, query.date);
  }

  /** Resumen del día en texto plano, listo para compartir. */
  @Get('day/summary')
  daySummary(@Param('groupId') groupId: string, @Query() query: DayQuery) {
    return this.doses.daySummary(groupId, query.date);
  }

  @Post('doses')
  @GroupRoles(GroupRole.ADMIN, GroupRole.CAREGIVER)
  record(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordDoseDto,
  ) {
    return this.doses.record(groupId, user.id, dto);
  }

  @Delete('doses/:doseId')
  @GroupRoles(GroupRole.ADMIN, GroupRole.CAREGIVER)
  @HttpCode(204)
  undo(
    @Param('groupId') groupId: string,
    @Param('doseId', ParseUUIDPipe) doseId: string,
    @CurrentMembership() membership: Membership,
  ) {
    return this.doses.undo(groupId, membership, doseId);
  }

  @Get('doses')
  history(@Param('groupId') groupId: string, @Query() query: HistoryQuery) {
    return this.doses.history(groupId, query);
  }
}
