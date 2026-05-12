import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ListAuditQueryDto } from '../audit/dto-list-audit-query';
import { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { name: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          memberships: {
            include: {
              tenant: true,
            },
          },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }

  async updateUserRole(
    actor: AuthUser,
    userId: string,
    input: UpdateUserRoleDto,
    meta?: RequestMeta,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { globalRole: input.role },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'admin.user.role.update',
      entityType: 'User',
      entityId: userId,
      metadata: {
        previousRole: user.globalRole,
        newRole: input.role,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  }

  async listAuditLogs(query: ListAuditQueryDto) {
    return this.auditService.list(query);
  }
}
