import { GlobalRole } from '@prisma/client';

export type AuthUser = {
  sub: string;
  email: string;
  globalRole: GlobalRole;
};
