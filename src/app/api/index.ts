export { ApiClientError, ApiNetworkError, type ApiErrorBody, type ValidationIssue } from './client';
export { authApi, type AuthenticatedUser, type LoginResponse } from './auth';
export {
  companiesApi,
  type CompanyRecord,
  type CompanyCreateInput,
  type CompanyUpdateInput,
} from './companies';
export {
  projectsApi,
  type ProjectRecord,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  type Platform,
  PLATFORMS,
} from './projects';
export { grantsApi, type ProjectGrant, type RoleName, ROLE_NAMES } from './grants';
export { usersApi } from './users';
