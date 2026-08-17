import { isCompanyRoleName, type CompanyRoleName } from '@project/application/auth/roles';
import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  ProjectGrant,
  UserAccount,
} from '@project/application/ports/account-repository';

import type { SqliteDb } from './sqlite';

interface UserRow {
  id: string;
  companyId: string;
  email: string;
  passwordHash: string | null;
  roleId: string | null;
  name: string | null;
  instanceAdmin: number;
  active: number;
  createdAt: string;
  updatedAt: string;
}

function toUser(row: UserRow): UserAccount {
  return {
    id: row.id,
    companyId: row.companyId,
    email: row.email,
    passwordHash: row.passwordHash,
    roleId: row.roleId,
    name: row.name,
    instanceAdmin: row.instanceAdmin === 1,
    active: row.active === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRoleName(name: string): CompanyRoleName {
  return isCompanyRoleName(name) ? name : 'viewer';
}

/**
 * SQLite `AccountRepository`. Synchronous under an async interface: prepared
 * statements return resolved/rejected promises (no await here).
 */
export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly db: SqliteDb) {}

  createUser(input: CreateUserInput): Promise<void> {
    const createdAt = input.createdAt;
    this.db
      .prepare(
        `INSERT INTO users (id, company_id, email, password_hash, created_at, updated_at)
         VALUES (@id, @companyId, @email, @passwordHash, @createdAt, @updatedAt)`,
      )
      .run({
        id: input.id,
        companyId: input.companyId,
        email: input.email,
        passwordHash: input.passwordHash,
        createdAt,
        updatedAt: createdAt,
      });
    return Promise.resolve();
  }

  getUserById(id: string): Promise<UserAccount | null> {
    const row = this.db
      .prepare(
        `SELECT id, company_id AS companyId, email, password_hash AS passwordHash,
                role_id AS roleId, name, instance_admin AS instanceAdmin,
                active, created_at AS createdAt, updated_at AS updatedAt
         FROM users WHERE id = ?`,
      )
      .get(id) as UserRow | undefined;
    return Promise.resolve(row === undefined ? null : toUser(row));
  }

  getUserByEmail(companyId: string, email: string): Promise<UserAccount | null> {
    const row = this.db
      .prepare(
        `SELECT id, company_id AS companyId, email, password_hash AS passwordHash,
                role_id AS roleId, name, instance_admin AS instanceAdmin,
                active, created_at AS createdAt, updated_at AS updatedAt
         FROM users WHERE company_id = ? AND email = ?`,
      )
      .get(companyId, email) as UserRow | undefined;
    return Promise.resolve(row === undefined ? null : toUser(row));
  }

  updateUser(user: UserAccount): Promise<void> {
    this.db
      .prepare(
        `UPDATE users
         SET password_hash = @passwordHash, role_id = @roleId, name = @name,
             instance_admin = @instanceAdmin, active = @active, updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({
        id: user.id,
        passwordHash: user.passwordHash,
        roleId: user.roleId,
        name: user.name,
        instanceAdmin: user.instanceAdmin ? 1 : 0,
        active: user.active ? 1 : 0,
        updatedAt: user.updatedAt,
      });
    return Promise.resolve();
  }

  listRolesForCompany(companyId: string): Promise<CompanyRole[]> {
    const rows = this.db
      .prepare('SELECT id, company_id AS companyId, name FROM roles WHERE company_id = ?')
      .all(companyId) as { id: string; companyId: string; name: string }[];
    return Promise.resolve(
      rows.map((row) => ({ id: row.id, companyId: row.companyId, name: toRoleName(row.name) })),
    );
  }

  listGrantsForUser(userId: string): Promise<ProjectGrant[]> {
    const rows = this.db
      .prepare(
        `SELECT pg.id, pg.project_id AS projectId, pg.user_id AS userId, r.name AS roleName
         FROM project_grants pg
         JOIN roles r ON r.id = pg.role_id
         WHERE pg.user_id = ?`,
      )
      .all(userId) as { id: string; projectId: string; userId: string; roleName: string }[];
    return Promise.resolve(
      rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        userId: row.userId,
        roleName: toRoleName(row.roleName),
      })),
    );
  }
}
