import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantRoles } from '../common/decorators/tenant-roles.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { TenantRolesGuard } from '../common/guards/tenant-roles.guard';
import { TenantRole } from '@prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(TenantRolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenants for current user' })
  list(@CurrentUser() user: AuthUser) {
    return this.tenantsService.listForUser(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant and become OWNER' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTenantDto,
    @Req() req: Request,
  ) {
    return this.tenantsService.createTenant(user, body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':tenantId/members')
  @TenantRoles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.MEMBER)
  @ApiOperation({ summary: 'List tenant members' })
  listMembers(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
  ) {
    return this.tenantsService.listMembers(user, tenantId);
  }

  @Post(':tenantId/members')
  @TenantRoles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Invite/add a member to tenant' })
  inviteMember(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Body() body: InviteMemberDto,
    @Req() req: Request,
  ) {
    return this.tenantsService.inviteMember(user, tenantId, body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch(':tenantId/members/:userId/role')
  @TenantRoles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Update role of a tenant member' })
  updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateMemberRoleDto,
    @Req() req: Request,
  ) {
    return this.tenantsService.updateMemberRole(user, tenantId, userId, body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
