import { GlobalRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @IsEnum(GlobalRole)
  role!: GlobalRole;
}
