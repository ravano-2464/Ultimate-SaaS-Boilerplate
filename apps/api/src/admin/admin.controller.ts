import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ListAuditQueryDto } from '../audit/dto-list-audit-query';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { AdminService } from './admin.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(GlobalRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (super admin)' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Update global role (super admin)' })
  updateUserRole(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: UpdateUserRoleDto,
    @Req() req: Request,
  ) {
    return this.adminService.updateUserRole(user, userId, body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List audit logs (super admin)' })
  listAuditLogs(@Query() query: ListAuditQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}
