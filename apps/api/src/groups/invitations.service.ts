import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './groups.dto';

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Devuelve el token en claro: es la única vez que se puede ver. */
  async create(groupId: string, createdById: string, dto: CreateInvitationDto) {
    const token = randomBytes(24).toString('base64url');
    const invitation = await this.prisma.invitation.create({
      data: {
        groupId,
        createdById,
        email: dto.email,
        role: dto.role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      token,
      url: `${webUrl}/invitaciones/${token}`,
    };
  }

  listPending(groupId: string) {
    return this.prisma.invitation.findMany({
      where: { groupId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(groupId: string, invitationId: string) {
    const { count } = await this.prisma.invitation.updateMany({
      where: { id: invitationId, groupId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Invitación no encontrada');
  }

  async preview(token: string) {
    const invitation = await this.findUsable(token);
    const { group } = invitation;
    return {
      group: { id: group.id, name: group.name, patientName: group.patientName },
      role: invitation.role,
      email: invitation.email,
      invitedBy: invitation.createdBy.name,
      expiresAt: invitation.expiresAt,
    };
  }

  async accept(token: string, user: AuthUser) {
    const invitation = await this.findUsable(token);
    if (invitation.email && invitation.email !== user.email) {
      throw new ForbiddenException('Esta invitación es para otra dirección de email');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: invitation.groupId } },
      });
      if (existing) throw new ConflictException('Ya sos miembro de este grupo');

      // La condición evita que dos personas usen el mismo enlace a la vez.
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date(), acceptedById: user.id },
      });
      if (count === 0) throw new GoneException('La invitación ya fue usada');

      await tx.membership.create({
        data: { userId: user.id, groupId: invitation.groupId, role: invitation.role },
      });
      return { ...invitation.group, myRole: invitation.role };
    });
  }

  private async findUsable(token: string) {
    if (!token || token.length > 100) throw new BadRequestException('Token inválido');
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { group: true, createdBy: { select: { name: true } } },
    });
    if (!invitation || invitation.revokedAt) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.acceptedAt) throw new GoneException('La invitación ya fue usada');
    if (invitation.expiresAt <= new Date()) throw new GoneException('La invitación venció');
    return invitation;
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
