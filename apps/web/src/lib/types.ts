export type GlobalRole = 'USER' | 'SUPER_ADMIN';
export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export type User = {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  createdAt: string;
  updatedAt: string;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  subscription?: Subscription | null;
};

export type Membership = {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  user?: User;
};

export type Subscription = {
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  seats: number;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  tenantId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: User;
  memberships?: Membership[];
};
