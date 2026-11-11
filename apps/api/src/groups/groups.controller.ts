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
import { GroupRole, type Membership } from '@prisma/client';
import { CurrentMembership, CurrentUser, GroupRoles, Public } from '../common/decorators';
import type { AuthUser } from '../common/request-context';
import { GroupAccessGuard } from './group-access.guard';
import {
  CreateGroupDto,
  CreateInvitationDto,
  UpdateGroupDto,
  UpdateMemberDto,
} from './groups.dto';
import { GroupsService } from './groups.service';
import { InvitationsService } from './invitations.service';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.groups.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto);
  }

  @Get(':groupId')
  @UseGuards(GroupAccessGuard)
  get(@Param('groupId') groupId: string, @CurrentMembership() membership: Membership) {
    return this.groups.get(groupId, membership);
  }

  @Patch(':groupId')
  @UseGuards(GroupAccessGuard)
  @GroupRoles(GroupRole.ADMIN)
  update(
    @Param('groupId') groupId: string,
    @CurrentMembership() membership: Membership,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.update(groupId, membership, dto);
  }
}

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups/:groupId/members')
@UseGuards(GroupAccessGuard)
export class MembersController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@Param('groupId') groupId: string) {
    return this.groups.listMembers(groupId);
  }

  @Patch(':userId')
  @GroupRoles(GroupRole.ADMIN)
  updateRole(
    @Param('groupId') groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.groups.updateMemberRole(groupId, userId, dto.role);
  }

  @Delete(':userId')
  @HttpCode(204)
  remove(
    @Param('groupId') groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentMembership() membership: Membership,
  ) {
    return this.groups.removeMember(groupId, membership, userId);
  }
}

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('groups/:groupId/invitations')
@UseGuards(GroupAccessGuard)
@GroupRoles(GroupRole.ADMIN)
export class GroupInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(groupId, user.id, dto);
  }

  @Get()
  list(@Param('groupId') groupId: string) {
    return this.invitations.listPending(groupId);
  }

  @Delete(':invitationId')
  @HttpCode(204)
  revoke(
    @Param('groupId') groupId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitations.revoke(groupId, invitationId);
  }
}

@ApiTags('invitations')
@Controller('invitations/:token')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Public()
  @Get()
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @ApiBearerAuth()
  @Post('accept')
  @HttpCode(200)
  accept(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.invitations.accept(token, user);
  }
}
