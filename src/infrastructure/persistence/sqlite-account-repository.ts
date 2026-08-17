import { isCompanyRoleName, type CompanyRoleName } from '@project/application/auth/roles';
import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  NewCompanyRole,
  ProjectGrant,
  UserAccount,
} from '@project/application/ports/account-repository';

import type { Db } from './sqlite-kysely';

interface UserRow {
  id: string;
  company_id: string | null;
  email: string;
  password_hash: string | null;
  role_id: string | null;
  name: string | null;
  instance_admin: number | boolean;
  active: number | boolean;
  password_must_change: number | boolean;
  created_at: string;
  updated_at: string;
}

function toUser(row: UserRow): UserAccount {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    passwordHash: row.password_hash,
    roleId: row.role_id,
    name: row.name,
    instanceAdmin: Boolean(row.instance_admin),
    active: Boolean(row.active),
    passwordMustChange: Boolean(row.password_must_change),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRoleName(name: string): CompanyRoleName {
  return isCompanyRoleName(name) ? name : 'viewer';
}

/**
 * SQLite `AccountRepository` backed by Kysely (ADR-0024).
 */
export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly db: Db) {}

  async createUser(input: CreateUserInput): Promise<void> {
    const createdAt = input.createdAt;
    await this.db
      .insertInto('users')
      .values({
        id: input.id,
        company_id: input.companyId,
        email: input.email,
        password_hash: input.passwordHash,
        created_at: createdAt,
        updated_at: createdAt,
      })
      .execute();
  }

  async getUserById(id: string): Promise<UserAccount | null> {
    const row = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toUser(row) : null;
  }

  async getUserByEmail(companyId: string | null, email: string): Promise<UserAccount | null> {
    let query = this.db.selectFrom('users').selectAll().where('email', '=', email);
    if (companyId === null) {
      query = query.where('company_id', 'is', null);
    } else {
      query = query.where('company_id', '=', companyId);
    }
    const row = await query.executeTakeFirst();
    return row ? toUser(row) : null;
  }

  async countUsers(): Promise<number> {
    const result = await this.db
      .selectFrom('users')
      .select((eb) => eb.fn.countAll<number | string>().as('count'))
      .executeTakeFirstOrThrow();
    return Number(result.count);
  }

  async createRole(role: NewCompanyRole): Promise<void> {
    const now = this.nowIso();
    await this.db
      .insertInto('roles')
      .values({
        id: role.id,
        company_id: role.companyId,
        name: role.name,
        created_at: now,
        updated_at: now,
      })
      .execute();
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  async updateUser(user: UserAccount): Promise<void> {
    await this.db
      .updateTable('users')
      .set({
        password_hash: user.passwordHash,
        role_id: user.roleId,
        name: user.name,
        instance_admin: user.instanceAdmin ? 1 : 0,
        active: user.active ? 1 : 0,
        password_must_change: user.passwordMustChange ? 1 : 0,
        updated_at: user.updatedAt,
      })
      .where('id', '=', user.id)
      .execute();
  }

  async listRolesForCompany(companyId: string): Promise<CompanyRole[]> {
    const rows = await this.db
      .selectFrom('roles')
      .select(['id', 'company_id', 'name'])
      .where('company_id', '=', companyId)
      .execute();
    return rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      name: toRoleName(row.name),
    }));
  }

  async listGrantsForUser(userId: string): Promise<ProjectGrant[]> {
    const rows = await this.db
      .selectFrom('project_grants')
      .innerJoin('roles', 'roles.id', 'project_grants.role_id')
      .select([
        'project_grants.id as grant_id',
        'project_grants.project_id',
        'project_grants.user_id',
        'roles.name as role_name',
      ])
      .where('project_grants.user_id', '=', userId)
      .execute();
    return rows.map((row) => ({
      id: row.grant_id,
      projectId: row.project_id,
      userId: row.user_id,
      roleName: toRoleName(row.role_name),
    }));
  }
}
