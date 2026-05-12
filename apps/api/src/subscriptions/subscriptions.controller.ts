import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('tenants/:tenantId/subscription')
@UseGuards(TenantRolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @TenantRoles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.MEMBER)
  @ApiOperation({ summary: 'Get tenant subscription' })
  async getByTenant(@Param('tenantId') tenantId: string) {
    const subscription = await this.subscriptionsService.getByTenant(tenantId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  @Put()
  @TenantRoles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Create/update tenant subscription' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateSubscriptionDto,
    @Req() req: Request,
  ) {
    return this.subscriptionsService.upsertByTenant(user, tenantId, body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
