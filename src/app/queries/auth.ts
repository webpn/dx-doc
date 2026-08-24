import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { authApi } from '../api';
import { useSessionStore } from '../stores/session-store';

/**
 * Rebuilds the in-memory session from the httpOnly cookie on a full page load.
 *
 * The cookie outlives the store, so without this a refresh or a pasted URL
 * renders as signed out even though the server still trusts the caller. Returns
 * `resolved: false` until the answer is in — the shell must not treat "not yet
 * known" as "signed out", or it flashes the login page over a live session.
 *
 * A 401 is the expected answer for an anonymous visitor, so it is not retried
 * and not surfaced as an error.
 */
export function useRestoreSession(): { resolved: boolean } {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    // The store is the source of truth once populated; this query exists only
    // to answer the boot-time question, so it must not refetch behind the user.
    enabled: session === null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data !== undefined && session === null) {
      setSession({
        userId: query.data.userId,
        companyId: query.data.companyId,
        passwordChangeRequired: query.data.passwordChangeRequired,
        instanceAdmin: query.data.instanceAdmin,
      });
    }
  }, [query.data, session, setSession]);

  // Once a session exists the question is settled. Otherwise wait for the
  // request to land: only a completed 401 means "genuinely signed out".
  return { resolved: session !== null || query.isError || query.isSuccess };
}

export function useLogin() {
  const setSession = useSessionStore((state) => state.setSession);
  return useMutation({
    mutationFn: (input: { email: string; password: string; companyId: string | undefined }) =>
      authApi.login(input.email, input.password, input.companyId),
    onSuccess: (result) => {
      setSession({
        userId: result.user.id,
        companyId: result.user.companyId,
        passwordChangeRequired: result.passwordChangeRequired,
        instanceAdmin: result.user.instanceAdmin,
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clearSession);
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  const clearPasswordChangeRequired = useSessionStore((state) => state.clearPasswordChangeRequired);
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(input.currentPassword, input.newPassword),
    onSuccess: () => {
      clearPasswordChangeRequired();
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (input: { email: string; companyId: string | undefined }) =>
      authApi.requestPasswordReset(input.email, input.companyId),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      authApi.confirmPasswordReset(input.token, input.newPassword),
  });
}
