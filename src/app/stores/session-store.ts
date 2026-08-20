import { create } from 'zustand';

/**
 * Cross-feature UI state for the authenticated actor (ADR-0013). The session
 * itself lives server-side (httpOnly cookie); this store only mirrors what
 * the shell needs to render without a round trip on every navigation.
 * Never place server-fetched entities here — that is TanStack Query's job.
 */
export interface SessionState {
  userId: string;
  companyId: string | null;
  passwordChangeRequired: boolean;
}

interface SessionStore {
  session: SessionState | null;
  setSession: (session: SessionState) => void;
  clearPasswordChangeRequired: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  setSession: (session) => {
    set({ session });
  },
  clearPasswordChangeRequired: () => {
    set((state) =>
      state.session === null
        ? state
        : { session: { ...state.session, passwordChangeRequired: false } },
    );
  },
  clearSession: () => {
    set({ session: null });
  },
}));
