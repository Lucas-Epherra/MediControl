import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupRole, Membership, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto } from './groups.dto';

const memberSelect = {
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.MembershipSelect;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { group: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ group, role }) => ({ ...group, myRole: role }));
  }

  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.careGroup.create({
      data: { ...dto, memberships: { create: { userId, role: GroupRole.ADMIN } } },
    });
    return { ...group, myRole: GroupRole.ADMIN };
  }

  async get(groupId: string, membership: Membership) {
    const group = await this.prisma.careGroup.findUniqueOrThrow({ where: { id: groupId } });
    return { ...group, myRole: membership.role };
  }

  async update(groupId: string, membership: Membership, dto: UpdateGroupDto) {
    const group = await this.prisma.careGroup.update({ where: { id: groupId }, data: dto });
    return { ...group, myRole: membership.role };
  }

  async listMembers(groupId: string) {
    const members = await this.prisma.membership.findMany({
      where: { groupId },
      select: memberSelect,
      orderBy: { createdAt: 'asc' },
    });
    return members.map(flattenMember);
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole) {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.findMember(tx, groupId, userId);
      if (target.role === GroupRole.ADMIN && role !== GroupRole.ADMIN) {
        await this.assertAnotherAdmin(tx, groupId, userId);
      }
      const updated = await tx.membership.update({
        where: { id: target.id },
        data: { role },
        select: memberSelect,
      });
      return flattenMember(updated);
    });
  }

  /** Un ADMIN puede quitar a cualquiera; el resto solo puede salir del grupo. */
  async removeMember(groupId: string, actor: Membership, userId: string) {
    if (actor.role !== GroupRole.ADMIN && actor.userId !== userId) {
      throw new ForbiddenException('Solo un administrador puede quitar a otros miembros');
    }
    await this.prisma.$transaction(async (tx) => {
      const target = await this.findMember(tx, groupId, userId);
      if (target.role === GroupRole.ADMIN) {
        await this.assertAnotherAdmin(tx, groupId, userId);
      }
      await tx.membership.delete({ where: { id: target.id } });
    });
  }

  private async findMember(tx: Prisma.TransactionClient, groupId: string, userId: string) {
    const member = await tx.membership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    return member;
  }

  private async assertAnotherAdmin(tx: Prisma.TransactionClient, groupId: string, userId: string) {
    const otherAdmins = await tx.membership.count({
      where: { groupId, role: GroupRole.ADMIN, userId: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException('El grupo debe tener al menos un administrador');
    }
  }
}

function flattenMember(member: Prisma.MembershipGetPayload<{ select: typeof memberSelect }>) {
  return { ...member.user, role: member.role, joinedAt: member.createdAt };
}
