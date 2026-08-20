import { apiRequest } from './client';

export const usersApi = {
  invite(companyId: string, email: string): Promise<{ userId: string }> {
    return apiRequest<{ userId: string }>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ companyId, email }),
    });
  },
};
