import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole, TenantRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TENANT_ROLES_KEY } from '../decorators/tenant-roles.decorator';
import { AuthUser } from '../types/auth-user.type';

type RequestWithContext = {
  params: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  user?: AuthUser;
  membership?: {
    tenantId: string;
    role: TenantRole;
  };
};

@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<TenantRole[]>(
      TENANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Unauthenticated user');
    }

    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return true;
    }

    const tenantIdFromParam = request.params.tenantId;
    const tenantIdFromQuery = request.query?.tenantId;
    const tenantIdFromBody =
      typeof request.body?.tenantId === 'string'
        ? request.body.tenantId
        : undefined;
    const tenantId = tenantIdFromParam ?? tenantIdFromQuery ?? tenantIdFromBody;

    if (!tenantId) {
      throw new BadRequestException(
        'tenantId is required for tenant role checks',
      );
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.sub,
          tenantId,
        },
      },
      select: {
        tenantId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this tenant');
    }

    request.membership = membership;

    if (requiredRoles.includes(membership.role)) {
      return true;
    }

    throw new ForbiddenException('Insufficient tenant role');
  }
}
