'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

const featureList = [
  'Auth lengkap (JWT + refresh token)',
  'RBAC global + tenant role',
  'Multi-tenant workspace',
  'Subscription management',
  'Redis queue + email worker',
  'Audit log terstruktur',
  'OpenAPI docs',
  'Admin panel',
];

export default function HomePage() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  if (!hydrated) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading session...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
          Ultimate SaaS Boilerplate dengan fondasi produksi untuk aplikasi B2B multi-tenant.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          Dibangun dengan Next.js + NestJS + Prisma + PostgreSQL + Redis, termasuk auth lengkap, RBAC, subscription,
          queue email, audit log, API docs, dan admin panel.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 transition hover:bg-slate-700"
            >
              Buka Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 transition hover:bg-slate-700"
              >
                Mulai Sekarang
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {featureList.map((item) => (
          <article key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            {item}
          </article>
        ))}
      </section>
    </div>
  );
}
