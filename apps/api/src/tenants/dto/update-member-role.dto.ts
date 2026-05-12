import { TenantRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsEnum(TenantRole)
  role!: TenantRole;
}
