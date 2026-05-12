'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

function navClass(active: boolean): string {
  return active
    ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-slate-50'
    : 'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout failure and clear local session anyway.
      }
    }
    clearSession();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
              Ultimate SaaS
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/" className={navClass(pathname === '/')}>
                Home
              </Link>
              <Link href="/dashboard" className={navClass(pathname.startsWith('/dashboard'))}>
                Dashboard
              </Link>
              {user?.globalRole === 'SUPER_ADMIN' ? (
                <Link href="/admin" className={navClass(pathname.startsWith('/admin'))}>
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-slate-50 transition hover:bg-slate-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
