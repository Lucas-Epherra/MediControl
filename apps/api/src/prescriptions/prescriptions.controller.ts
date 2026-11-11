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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { GroupRoles } from '../common/decorators';
import { GroupAccessGuard } from '../groups/group-access.guard';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from './prescriptions.dto';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('prescriptions')
@ApiBearerAuth()
@Controller('groups/:groupId/prescriptions')
@UseGuards(GroupAccessGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  list(@Param('groupId') groupId: string) {
    return this.prescriptions.list(groupId);
  }

  @Post()
  @GroupRoles(GroupRole.ADMIN)
  create(@Param('groupId') groupId: string, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptions.create(groupId, dto);
  }

  @Patch(':prescriptionId')
  @GroupRoles(GroupRole.ADMIN)
  update(
    @Param('groupId') groupId: string,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptions.update(groupId, prescriptionId, dto);
  }

  @Delete(':prescriptionId')
  @GroupRoles(GroupRole.ADMIN)
  @HttpCode(204)
  remove(
    @Param('groupId') groupId: string,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
  ) {
    return this.prescriptions.remove(groupId, prescriptionId);
  }
}
