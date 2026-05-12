'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { adminApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.listUsers({ search, page: 1, limit: 20 }),
    enabled: hydrated && user?.globalRole === 'SUPER_ADMIN',
  });

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit', tenantFilter],
    queryFn: () => adminApi.listAuditLogs({ tenantId: tenantFilter || undefined, page: 1, limit: 30 }),
    enabled: hydrated && user?.globalRole === 'SUPER_ADMIN',
  });

  const roleMutation = useMutation({
    mutationFn: (payload: { userId: string; role: 'USER' | 'SUPER_ADMIN' }) => adminApi.updateUserRole(payload.userId, payload.role),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to update role.');
    },
  });

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  if (!hydrated) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading session...</div>;
  }

  if (user?.globalRole !== 'SUPER_ADMIN') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Halaman ini khusus untuk `SUPER_ADMIN`.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-600">Kelola global role user dan monitor audit trail.</p>
      </section>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="mb-4 flex gap-2" onSubmit={onSearchSubmit}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user by name/email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50">
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data?.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-800">{item.name}</td>
                  <td className="py-2 text-slate-600">{item.email}</td>
                  <td className="py-2">{item.globalRole}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ userId: item.id, role: 'USER' })}
                      >
                        Set USER
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        disabled={roleMutation.isPending}
                        onClick={() => roleMutation.mutate({ userId: item.id, role: 'SUPER_ADMIN' })}
                      >
                        Set SUPER_ADMIN
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-2">
          <input
            value={tenantFilter}
            onChange={(event) => setTenantFilter(event.target.value)}
            placeholder="Filter by tenantId (optional)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50"
          >
            Filter
          </button>
        </div>
        <div className="space-y-2">
          {(auditQuery.data?.items ?? []).map((log) => (
            <article key={log.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="font-medium text-slate-800">{log.action}</div>
              <div className="mt-1 text-xs text-slate-500">
                actor: {log.actorId ?? '-'} | tenant: {log.tenantId ?? '-'} | entity: {log.entityType ?? '-'}:{' '}
                {log.entityId ?? '-'}
              </div>
              <div className="mt-1 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
