import type { CompanyRoleName } from '../auth/roles';

/**
 * Account persistence port (REQ-SEC-001/002/003/013/014).
 *
 * Backs the identity and authorisation logic: users, the four company roles,
 * and per-project grants. No application rule references a database type.
 */
export interface UserAccount {
  id: string;
  companyId: string;
  email: string;
  passwordHash: string | null;
  roleId: string | null;
  name: string | null;
  instanceAdmin: boolean;
  /** Deactivation flag (REQ-SEC-013): a deactivated user's sessions stop. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRole {
  id: string;
  companyId: string;
  name: CompanyRoleName;
}

export interface ProjectGrant {
  id: string;
  projectId: string;
  userId: string;
  roleName: CompanyRoleName;
}

export interface CreateUserInput {
  id: string;
  companyId: string;
  email: string;
  /** Null for SSO-only accounts that have no local password. */
  passwordHash: string | null;
  createdAt: string;
}

export interface AccountRepository {
  createUser(input: CreateUserInput): Promise<void>;
  getUserById(id: string): Promise<UserAccount | null>;
  getUserByEmail(companyId: string, email: string): Promise<UserAccount | null>;
  updateUser(user: UserAccount): Promise<void>;
  listRolesForCompany(companyId: string): Promise<CompanyRole[]>;
  listGrantsForUser(userId: string): Promise<ProjectGrant[]>;
}
