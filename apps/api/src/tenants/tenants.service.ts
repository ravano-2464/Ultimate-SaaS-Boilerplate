import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GlobalRole,
  SubscriptionPlan,
  SubscriptionStatus,
  TenantRole,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async listForUser(user: AuthUser) {
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      const tenants = await this.prisma.tenant.findMany({
        include: {
          subscription: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        items: tenants,
      };
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.sub },
      include: {
        tenant: {
          include: {
            subscription: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: memberships.map((membership) => ({
        tenant: membership.tenant,
        role: membership.role,
      })),
    };
  }

  async createTenant(
    user: AuthUser,
    input: CreateTenantDto,
    meta?: RequestMeta,
  ) {
    const slug = await this.generateUniqueTenantSlug(input.name);

    const { tenant, membership } = await this.prisma.$transaction(
      async (tx) => {
        const newTenant = await tx.tenant.create({
          data: {
            name: input.name,
            slug,
          },
        });

        const newMembership = await tx.membership.create({
          data: {
            userId: user.sub,
            tenantId: newTenant.id,
            role: TenantRole.OWNER,
          },
        });

        await tx.subscription.create({
          data: {
            tenantId: newTenant.id,
            plan: SubscriptionPlan.STARTER,
            status: SubscriptionStatus.TRIALING,
            seats: 5,
          },
        });

        return {
          tenant: newTenant,
          membership: newMembership,
        };
      },
    );

    await this.auditService.log({
      actorId: user.sub,
      tenantId: tenant.id,
      action: 'tenant.create',
      entityType: 'Tenant',
      entityId: tenant.id,
      metadata: {
        slug: tenant.slug,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { tenant, membership };
  }

  async listMembers(user: AuthUser, tenantId: string) {
    await this.ensureTenantAccess(user, tenantId);

    const members = await this.prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            globalRole: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return { items: members };
  }

  async inviteMember(
    user: AuthUser,
    tenantId: string,
    input: InviteMemberDto,
    meta?: RequestMeta,
  ) {
    const actorMembership = await this.ensureMemberManagementAccess(
      user,
      tenantId,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'User not found. Register the user first or extend this flow with invitation tokens.',
      );
    }

    if (
      actorMembership?.role === TenantRole.ADMIN &&
      input.role === TenantRole.OWNER
    ) {
      throw new ForbiddenException('Admin cannot assign OWNER role');
    }

    const membership = await this.prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: targetUser.id,
          tenantId,
        },
      },
      update: {
        role: input.role,
      },
      create: {
        userId: targetUser.id,
        tenantId,
        role: input.role,
      },
    });

    const inviter = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { name: true, email: true },
    });

    await this.emailService.queueTenantInviteEmail({
      to: targetUser.email,
      tenantName: tenant.name,
      role: input.role,
      invitedBy: inviter?.name ?? inviter?.email ?? 'A teammate',
    });

    await this.auditService.log({
      actorId: user.sub,
      tenantId,
      action: 'tenant.member.invite',
      entityType: 'Membership',
      entityId: membership.id,
      metadata: {
        invitedEmail: targetUser.email,
        role: input.role,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    this.realtimeGateway.emitTenantEvent(tenantId, 'tenant.member.updated', {
      tenantId,
      userId: targetUser.id,
      role: input.role,
    });

    return membership;
  }

  async updateMemberRole(
    user: AuthUser,
    tenantId: string,
    userId: string,
    input: UpdateMemberRoleDto,
    meta?: RequestMeta,
  ) {
    const actorMembership = await this.ensureMemberManagementAccess(
      user,
      tenantId,
    );
    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this tenant');
    }

    if (
      targetMembership.role === TenantRole.OWNER &&
      user.globalRole !== GlobalRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Cannot change OWNER role');
    }

    if (
      actorMembership?.role === TenantRole.ADMIN &&
      input.role === TenantRole.OWNER
    ) {
      throw new ForbiddenException('Admin cannot assign OWNER role');
    }

    const updated = await this.prisma.membership.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: {
        role: input.role,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      tenantId,
      action: 'tenant.member.role.update',
      entityType: 'Membership',
      entityId: updated.id,
      metadata: {
        userId,
        newRole: input.role,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    this.realtimeGateway.emitTenantEvent(tenantId, 'tenant.member.updated', {
      tenantId,
      userId,
      role: input.role,
    });

    return updated;
  }

  private async ensureTenantAccess(user: AuthUser, tenantId: string) {
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.sub,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this tenant');
    }
  }

  private async ensureMemberManagementAccess(user: AuthUser, tenantId: string) {
    if (user.globalRole === GlobalRole.SUPER_ADMIN) {
      return null;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.sub,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this tenant');
    }

    if (
      membership.role !== TenantRole.OWNER &&
      membership.role !== TenantRole.ADMIN
    ) {
      throw new ForbiddenException('Insufficient tenant role');
    }

    return membership;
  }

  private async generateUniqueTenantSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    let slug = baseSlug || 'workspace';
    let counter = 1;

    while (true) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
