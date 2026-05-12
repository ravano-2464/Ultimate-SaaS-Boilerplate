import { Injectable } from '@nestjs/common';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async getByTenant(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    return subscription;
  }

  async upsertByTenant(
    user: AuthUser,
    tenantId: string,
    input: UpdateSubscriptionDto,
    meta?: RequestMeta,
  ) {
    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        plan: input.plan,
        status: input.status,
        seats: input.seats,
        currentPeriodEnd: input.currentPeriodEnd
          ? new Date(input.currentPeriodEnd)
          : undefined,
      },
      create: {
        tenantId,
        plan: input.plan ?? SubscriptionPlan.FREE,
        status: input.status ?? SubscriptionStatus.TRIALING,
        seats: input.seats ?? 1,
        currentPeriodEnd: input.currentPeriodEnd
          ? new Date(input.currentPeriodEnd)
          : undefined,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      tenantId,
      action: 'subscription.update',
      entityType: 'Subscription',
      entityId: subscription.id,
      metadata: {
        plan: subscription.plan,
        status: subscription.status,
        seats: subscription.seats,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    this.realtimeGateway.emitTenantEvent(tenantId, 'subscription.updated', {
      tenantId,
      subscription,
    });

    return subscription;
  }
}
