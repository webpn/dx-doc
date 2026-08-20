import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../api';
import { useSessionStore } from '../stores/session-store';

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
