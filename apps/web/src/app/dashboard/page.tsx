'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, authApi, subscriptionsApi, tenantsApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { TenantRole } from '@/lib/types';

type TenantOption = {
  tenantId: string;
  tenantName: string;
  role: TenantRole | null;
};

const planOptions = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
const statusOptions = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] as const;

function rolePill(role: string): string {
  if (role === 'OWNER') return 'bg-emerald-100 text-emerald-800';
  if (role === 'ADMIN') return 'bg-sky-100 text-sky-800';
  if (role === 'MEMBER') return 'bg-slate-200 text-slate-700';
  return 'bg-amber-100 text-amber-800';
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const memberships = useAuthStore((state) => state.memberships);
  const selectedTenantId = useAuthStore((state) => state.selectedTenantId);
  const setSelectedTenantId = useAuthStore((state) => state.setSelectedTenantId);
  const setUserContext = useAuthStore((state) => state.setUserContext);

  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TenantRole>('MEMBER');
  const [memberRoleChanges, setMemberRoleChanges] = useState<Record<string, TenantRole>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: hydrated && !!accessToken,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUserContext(meQuery.data);
    }
  }, [meQuery.data, setUserContext]);

  const tenantQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.list,
    enabled: hydrated && !!accessToken,
  });

  const tenantOptions = useMemo<TenantOption[]>(() => {
    const items = tenantQuery.data?.items ?? [];
    return items.map((item) => {
      if ('tenant' in item) {
        return {
          tenantId: item.tenant.id,
          tenantName: item.tenant.name,
          role: item.role,
        };
      }
      return {
        tenantId: item.id,
        tenantName: item.name,
        role: null,
      };
    });
  }, [tenantQuery.data]);

  useEffect(() => {
    if (!selectedTenantId && tenantOptions[0]) {
      setSelectedTenantId(tenantOptions[0].tenantId);
    }
  }, [selectedTenantId, tenantOptions, setSelectedTenantId]);

  const selectedTenant = tenantOptions.find((item) => item.tenantId === selectedTenantId) ?? null;
  const selectedMembership = memberships.find((item) => item.tenantId === selectedTenantId);
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const canManageMembers = isSuperAdmin || ['OWNER', 'ADMIN'].includes(selectedMembership?.role ?? '');
  const canEditSubscription = canManageMembers;

  const membersQuery = useQuery({
    queryKey: ['tenants', selectedTenantId, 'members'],
    queryFn: () => tenantsApi.members(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });

  const subscriptionQuery = useQuery({
    queryKey: ['tenants', selectedTenantId, 'subscription'],
    queryFn: () => subscriptionsApi.get(selectedTenantId as string),
    enabled: Boolean(selectedTenantId),
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      setWorkspaceName('');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to create workspace.');
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: (payload: { tenantId: string; email: string; role: TenantRole }) =>
      tenantsApi.inviteMember(payload.tenantId, {
        email: payload.email,
        role: payload.role,
      }),
    onSuccess: () => {
      setInviteEmail('');
      setErrorMessage(null);
      if (selectedTenantId) {
        queryClient.invalidateQueries({ queryKey: ['tenants', selectedTenantId, 'members'] });
      }
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to invite member.');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { tenantId: string; userId: string; role: TenantRole }) =>
      tenantsApi.updateMemberRole(payload.tenantId, payload.userId, { role: payload.role }),
    onSuccess: () => {
      if (selectedTenantId) {
        queryClient.invalidateQueries({ queryKey: ['tenants', selectedTenantId, 'members'] });
      }
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to update member role.');
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: (payload: { tenantId: string; plan: string; status: string; seats: number }) =>
      subscriptionsApi.update(payload.tenantId, {
        plan: payload.plan as (typeof planOptions)[number],
        status: payload.status as (typeof statusOptions)[number],
        seats: payload.seats,
      }),
    onSuccess: () => {
      if (selectedTenantId) {
        queryClient.invalidateQueries({ queryKey: ['tenants', selectedTenantId, 'subscription'] });
      }
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to update subscription.');
    },
  });

  const handleCreateWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceName.trim()) return;
    createWorkspaceMutation.mutate({ name: workspaceName.trim() });
  };

  const handleInviteMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTenantId) return;
    inviteMemberMutation.mutate({
      tenantId: selectedTenantId,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const handleUpdateSubscription = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTenantId) return;

    const form = new FormData(event.currentTarget);
    updateSubscriptionMutation.mutate({
      tenantId: selectedTenantId,
      plan: String(form.get('plan')),
      status: String(form.get('status')),
      seats: Number(form.get('seats')),
    });
  };

  if (!hydrated) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading session...</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
        Silakan login terlebih dulu untuk membuka dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Current Role</div>
          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${rolePill(user.globalRole)}`}>
            {user.globalRole}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Tenants</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{tenantOptions.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">API Docs</div>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') ?? 'http://localhost:4000'}/docs`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-slate-900 underline underline-offset-2"
          >
            Open Swagger
          </a>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tenant Context</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="tenant" className="text-sm font-medium text-slate-700">
              Active tenant
            </label>
            <select
              id="tenant"
              value={selectedTenantId ?? ''}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {tenantOptions.map((option) => (
                <option key={option.tenantId} value={option.tenantId}>
                  {option.tenantName}
                </option>
              ))}
            </select>
            {selectedTenant ? (
              <div className="text-xs text-slate-500">
                Role in tenant:{' '}
                <span className={`rounded-full px-2 py-0.5 font-semibold ${rolePill(selectedTenant.role ?? 'SUPER_ADMIN')}`}>
                  {selectedTenant.role ?? 'SUPER_ADMIN_ACCESS'}
                </span>
              </div>
            ) : null}
          </div>
          <form className="space-y-2" onSubmit={handleCreateWorkspace}>
            <label htmlFor="workspace-name" className="text-sm font-medium text-slate-700">
              Create workspace
            </label>
            <div className="flex gap-2">
              <input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={createWorkspaceMutation.isPending}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-60"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Members</h2>
        {selectedTenantId ? (
          <>
            <div className="mt-4 overflow-x-auto">
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
                  {(membersQuery.data?.items ?? []).map((member) => (
                    <tr key={member.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-800">{member.user?.name ?? '-'}</td>
                      <td className="py-2 text-slate-600">{member.user?.email ?? '-'}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rolePill(member.role)}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <select
                            value={memberRoleChanges[member.userId] ?? member.role}
                            onChange={(event) =>
                              setMemberRoleChanges((prev) => ({
                                ...prev,
                                [member.userId]: event.target.value as TenantRole,
                              }))
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            disabled={!canManageMembers}
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="OWNER">OWNER</option>
                          </select>
                          <button
                            type="button"
                            disabled={!canManageMembers || updateRoleMutation.isPending}
                            onClick={() =>
                              updateRoleMutation.mutate({
                                tenantId: selectedTenantId,
                                userId: member.userId,
                                role: memberRoleChanges[member.userId] ?? member.role,
                              })
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={handleInviteMember}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="member@company.com"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={!canManageMembers}
              />
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as TenantRole)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={!canManageMembers}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
              </select>
              <button
                type="submit"
                disabled={!canManageMembers || inviteMemberMutation.isPending}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-60"
              >
                Invite
              </button>
            </form>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Pilih tenant terlebih dulu.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
        {subscriptionQuery.data ? (
          <form
            key={subscriptionQuery.data.id}
            className="mt-4 grid gap-3 md:grid-cols-4"
            onSubmit={handleUpdateSubscription}
          >
            <select
              name="plan"
              defaultValue={subscriptionQuery.data.plan}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={!canEditSubscription}
            >
              {planOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={subscriptionQuery.data.status}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={!canEditSubscription}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              name="seats"
              type="number"
              defaultValue={subscriptionQuery.data.seats}
              min={1}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={!canEditSubscription}
            />
            <button
              type="submit"
              disabled={!canEditSubscription || updateSubscriptionMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-60"
            >
              Save
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Subscription belum tersedia.</p>
        )}
      </section>
    </div>
  );
}
