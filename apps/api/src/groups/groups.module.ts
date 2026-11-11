import { Module } from '@nestjs/common';
import { GroupAccessGuard } from './group-access.guard';
import {
  GroupInvitationsController,
  GroupsController,
  InvitationsController,
  MembersController,
} from './groups.controller';
import { GroupsService } from './groups.service';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [
    GroupsController,
    MembersController,
    GroupInvitationsController,
    InvitationsController,
  ],
  providers: [GroupsService, InvitationsService, GroupAccessGuard],
})
export class GroupsModule {}
