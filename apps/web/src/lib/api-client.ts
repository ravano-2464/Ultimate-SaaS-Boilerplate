'use client';

import { authStore } from './auth-store';
import { AuditLog, AuthSession, Membership, Subscription, Tenant, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retryOnAuthError?: boolean;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

async function refreshSession(): Promise<boolean> {
  const state = authStore.get();
  if (!state.refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: state.refreshToken,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      authStore.get().clearSession();
      return false;
    }

    const payload = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      tokenType: 'Bearer';
    };

    authStore.set({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    });
    return true;
  } catch {
    authStore.get().clearSession();
    return false;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, retryOnAuthError = true } = options;
  const state = authStore.get();

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (auth && state.accessToken) {
    headers.set('Authorization', `Bearer ${state.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (response.status === 401 && auth && retryOnAuthError) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        retryOnAuthError: false,
      });
    }
  }

  if (!response.ok) {
    const payload = await parseResponse<unknown>(response);
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return parseResponse<T>(response);
}

export const authApi = {
  register: (input: { email: string; password: string; name: string; tenantName?: string }) =>
    apiRequest<AuthSession & { tenant: Tenant; membership: Membership }>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  login: (input: { email: string; password: string }) =>
    apiRequest<AuthSession & { memberships: Membership[] }>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  me: () =>
    apiRequest<{
      user: User;
      memberships: Membership[];
    }>('/auth/me'),
  logout: (refreshToken: string) =>
    apiRequest<{ success: true }>('/auth/logout', {
      method: 'POST',
      auth: false,
      body: { refreshToken },
      retryOnAuthError: false,
    }),
};

export const tenantsApi = {
  list: () =>
    apiRequest<{
      items: Array<
        | Tenant
        | {
            tenant: Tenant;
            role: Membership['role'];
          }
      >;
    }>('/tenants'),
  create: (input: { name: string }) =>
    apiRequest<{ tenant: Tenant; membership: Membership }>('/tenants', {
      method: 'POST',
      body: input,
    }),
  members: (tenantId: string) =>
    apiRequest<{
      items: Membership[];
    }>(`/tenants/${tenantId}/members`),
  inviteMember: (tenantId: string, input: { email: string; role: Membership['role'] }) =>
    apiRequest<Membership>(`/tenants/${tenantId}/members`, {
      method: 'POST',
      body: input,
    }),
  updateMemberRole: (tenantId: string, userId: string, input: { role: Membership['role'] }) =>
    apiRequest<Membership>(`/tenants/${tenantId}/members/${userId}/role`, {
      method: 'PATCH',
      body: input,
    }),
};

export const subscriptionsApi = {
  get: (tenantId: string) => apiRequest<Subscription>(`/tenants/${tenantId}/subscription`),
  update: (
    tenantId: string,
    input: {
      plan?: Subscription['plan'];
      status?: Subscription['status'];
      seats?: number;
      currentPeriodEnd?: string;
    },
  ) =>
    apiRequest<Subscription>(`/tenants/${tenantId}/subscription`, {
      method: 'PUT',
      body: input,
    }),
};

export const adminApi = {
  listUsers: (params: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{ page: number; limit: number; total: number; items: User[] }>(`/admin/users${suffix}`);
  },
  listAuditLogs: (params: { tenantId?: string; action?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.action) query.set('action', params.action);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{ page: number; limit: number; total: number; items: AuditLog[] }>(`/admin/audit-logs${suffix}`);
  },
  updateUserRole: (userId: string, role: 'USER' | 'SUPER_ADMIN') =>
    apiRequest<User>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
    }),
};
