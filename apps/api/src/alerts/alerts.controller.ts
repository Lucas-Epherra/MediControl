import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GroupAccessGuard } from '../groups/group-access.guard';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('groups/:groupId/alerts')
@UseGuards(GroupAccessGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Param('groupId') groupId: string) {
    return this.alerts.list(groupId);
  }
}
