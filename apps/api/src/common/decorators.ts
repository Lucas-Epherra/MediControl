import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { GroupRole, Membership } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from './request-context';

export const IS_PUBLIC_KEY = 'isPublic';
/** Excluye la ruta del JwtAuthGuard global. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const GROUP_ROLES_KEY = 'groupRoles';
/** Roles del grupo que pueden usar la ruta. Requiere GroupAccessGuard. */
export const GroupRoles = (...roles: GroupRole[]) => SetMetadata(GROUP_ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest<Request>().user!,
);

export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Membership =>
    ctx.switchToHttp().getRequest<Request>().membership!,
);
