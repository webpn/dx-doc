import { useMutation } from '@tanstack/react-query';

import { usersApi } from '../api';

/**
 * Invite a user into a company (REQ-SEC-012).
 *
 * No cache invalidation: the invite creates an account inside the company but
 * grants it nothing, so no list this client currently reads changes. Project
 * access is a separate, explicit step (`useSetGrant`) — which is the point of
 * deny-by-default. When a company-members list exists, invalidate it here.
 */
export function useInviteUser(companyId: string) {
  return useMutation({
    mutationFn: (email: string) => usersApi.invite(companyId, email),
  });
}
