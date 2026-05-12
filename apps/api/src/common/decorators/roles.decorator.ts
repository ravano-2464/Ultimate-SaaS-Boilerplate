import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (
  ...roles: GlobalRole[]
): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
