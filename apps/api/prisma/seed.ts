import argon2 from 'argon2';
import { GlobalRole, PrismaClient, SubscriptionPlan, SubscriptionStatus, TenantRole } from '@prisma/client';

const prisma = new PrismaClient();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function main(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

  if (!email || !password) {
    console.log('Skipping seed: set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.');
    return;
  }

  const passwordHash = await argon2.hash(password);
  const tenantName = `${name} Workspace`;
  const tenantSlug = slugify(tenantName);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, passwordHash, globalRole: GlobalRole.SUPER_ADMIN },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { name: tenantName, slug: tenantSlug },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: { role: TenantRole.OWNER },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: TenantRole.OWNER,
    },
  });

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      plan: SubscriptionPlan.ENTERPRISE,
      status: SubscriptionStatus.ACTIVE,
      seats: 100,
    },
    create: {
      tenantId: tenant.id,
      plan: SubscriptionPlan.ENTERPRISE,
      status: SubscriptionStatus.ACTIVE,
      seats: 100,
    },
  });

  console.log(`Seed complete for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
