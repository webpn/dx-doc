import type { CompanyRoleName } from '../auth/roles';

/**
 * Account persistence port (REQ-SEC-001/002/003/013/014).
 *
 * Backs the identity and authorisation logic: users, the four company roles,
 * and per-project grants. No application rule references a database type.
 */
export interface UserAccount {
  id: string;
  /** Nullable: an instance administrator exists outside any tenant (REQ-SEC-014). */
  companyId: string | null;
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
  /** Nullable for a company-less instance administrator (REQ-SEC-014). */
  companyId: string | null;
  email: string;
  /** Null for SSO-only accounts that have no local password. */
  passwordHash: string | null;
  createdAt: string;
}

export interface NewCompanyRole {
  id: string;
  companyId: string;
  name: CompanyRoleName;
}

export interface AccountRepository {
  createUser(input: CreateUserInput): Promise<void>;
  getUserById(id: string): Promise<UserAccount | null>;
  getUserByEmail(companyId: string | null, email: string): Promise<UserAccount | null>;
  updateUser(user: UserAccount): Promise<void>;
  /** Number of users in the whole instance, used by the first-run bootstrap. */
  countUsers(): Promise<number>;
  createRole(role: NewCompanyRole): Promise<void>;
  listRolesForCompany(companyId: string): Promise<CompanyRole[]>;
  listGrantsForUser(userId: string): Promise<ProjectGrant[]>;
}
