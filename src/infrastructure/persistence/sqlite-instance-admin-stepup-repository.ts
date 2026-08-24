import type {
  InstanceAdminStepUp,
  InstanceAdminStepUpRepository,
  NewInstanceAdminStepUp,
} from '@project/application/ports/instance-admin-stepup-repository';

import type { Db } from './sqlite-kysely';

interface InstanceAdminStepUpRow {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
  expires_at: string;
}

function toStepUp(row: InstanceAdminStepUpRow): InstanceAdminStepUp {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * SQLite `InstanceAdminStepUpRepository` backed by Kysely (ADR-0024, ADR-0027).
 *
 * Expiry is enforced in the query, not in application code: `expires_at`
 * is compared lexicographically against `now` (ISO-8601 text, the existing
 * convention — see `sessions`), so an expired row is indistinguishable from
 * an absent one at the call site. There is no sweeper; rows are disposable
 * and expiry is only ever checked on read.
 */
export class SqliteInstanceAdminStepUpRepository implements InstanceAdminStepUpRepository {
  constructor(private readonly db: Db) {}

  async openStepUp(stepUp: NewInstanceAdminStepUp): Promise<void> {
    // The table has a unique constraint on (user_id, company_id): re-opening
    // replaces the existing window rather than accumulating one per open, so
    // "is a window open for this company?" always has exactly one answer.
    await this.db
      .insertInto('instance_admin_stepups')
      .values({
        id: stepUp.id,
        user_id: stepUp.userId,
        company_id: stepUp.companyId,
        created_at: stepUp.createdAt,
        expires_at: stepUp.expiresAt,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'company_id']).doUpdateSet({
          id: stepUp.id,
          created_at: stepUp.createdAt,
          expires_at: stepUp.expiresAt,
        }),
      )
      .execute();
  }

  async getActiveStepUp(
    userId: string,
    companyId: string,
    now: string,
  ): Promise<InstanceAdminStepUp | null> {
    const row = await this.db
      .selectFrom('instance_admin_stepups')
      .selectAll()
      .where('user_id', '=', userId)
      .where('company_id', '=', companyId)
      .where('expires_at', '>', now)
      .executeTakeFirst();
    return row ? toStepUp(row) : null;
  }

  async listActiveStepUpsForUser(userId: string, now: string): Promise<InstanceAdminStepUp[]> {
    const rows = await this.db
      .selectFrom('instance_admin_stepups')
      .selectAll()
      .where('user_id', '=', userId)
      .where('expires_at', '>', now)
      .execute();
    return rows.map(toStepUp);
  }

  async closeStepUp(userId: string, companyId: string): Promise<void> {
    await this.db
      .deleteFrom('instance_admin_stepups')
      .where('user_id', '=', userId)
      .where('company_id', '=', companyId)
      .execute();
  }
}
