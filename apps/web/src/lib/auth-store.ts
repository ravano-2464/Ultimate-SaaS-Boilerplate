'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AuthSession, Membership, User } from './types';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  memberships: Membership[];
  selectedTenantId: string | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (session: AuthSession) => void;
  setUserContext: (payload: { user: User; memberships: Membership[] }) => void;
  setSelectedTenantId: (tenantId: string | null) => void;
  clearSession: () => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getDefaultSelectedTenant = (memberships: Membership[]): string | null => memberships[0]?.tenantId ?? null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      memberships: [],
      selectedTenantId: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setSession: (session) => {
        const current = get();
        const memberships = session.memberships ?? current.memberships;
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
          memberships,
          selectedTenantId: current.selectedTenantId ?? getDefaultSelectedTenant(memberships),
        });
      },
      setUserContext: ({ user, memberships }) => {
        const current = get();
        const selectedTenantId = memberships.some((item) => item.tenantId === current.selectedTenantId)
          ? current.selectedTenantId
          : getDefaultSelectedTenant(memberships);

        set({
          user,
          memberships,
          selectedTenantId,
        });
      },
      setSelectedTenantId: (tenantId) => set({ selectedTenantId: tenantId }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          memberships: [],
          selectedTenantId: null,
        }),
    }),
    {
      name: 'ultimate-saas-auth',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : localStorage)),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        memberships: state.memberships,
        selectedTenantId: state.selectedTenantId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export const authStore = {
  get: () => useAuthStore.getState(),
  set: (updater: Partial<AuthState>) => useAuthStore.setState(updater),
};
