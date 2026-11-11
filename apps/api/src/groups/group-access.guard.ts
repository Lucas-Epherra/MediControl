import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { GroupRole } from '@prisma/client';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { GROUP_ROLES_KEY } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Valida que el usuario pertenezca al grupo de `:groupId` y que su rol alcance.
 * Responde 404 si no es miembro, para no revelar qué grupos existen.
 */
@Injectable()
export class GroupAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const groupId = request.params.groupId;
    if (typeof groupId !== 'string' || !isUUID(groupId) || !request.user) {
      throw new NotFoundException('Grupo no encontrado');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_groupId: { userId: request.user.id, groupId } },
    });
    if (!membership) {
      throw new NotFoundException('Grupo no encontrado');
    }

    const roles = this.reflector.getAllAndOverride<GroupRole[] | undefined>(GROUP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(membership.role)) {
      throw new ForbiddenException('Tu rol en el grupo no permite esta acción');
    }

    request.membership = membership;
    return true;
  }
}
