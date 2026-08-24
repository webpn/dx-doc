/**
 * Instance-admin step-up windows (ADR-0027, REQ-SEC-014).
 *
 * A step-up is an explicit, expiring authorisation fact: it records that a
 * holder of the `instance_admin` capability re-authenticated in order to
 * administer one named company, and until when. It is deliberately NOT a
 * change to the user's `companyId` — that column stays null forever, which is
 * the invariant REQ-SEC-014 exists to protect.
 *
 * Expiry is enforced on read rather than by a sweeper: `getActive` must never
 * return a window whose `expiresAt` has passed, so a missed cleanup cannot
 * silently extend anyone's authorisation.
 */
export interface InstanceAdminStepUp {
  id: string;
  userId: string;
  companyId: string;
  createdAt: string;
  expiresAt: string;
}

export interface NewInstanceAdminStepUp {
  id: string;
  userId: string;
  companyId: string;
  createdAt: string;
  expiresAt: string;
}

export interface InstanceAdminStepUpRepository {
  /** Opens (or replaces) the window for this user and company. */
  openStepUp(stepUp: NewInstanceAdminStepUp): Promise<void>;

  /**
   * The unexpired window for this user and company, or null. Implementations
   * MUST compare against `now` and treat an expired row as absent.
   */
  getActiveStepUp(
    userId: string,
    companyId: string,
    now: string,
  ): Promise<InstanceAdminStepUp | null>;

  /** Every unexpired window for this user, for the UI's current-context banner. */
  listActiveStepUpsForUser(userId: string, now: string): Promise<InstanceAdminStepUp[]>;

  /** Closes a window early. */
  closeStepUp(userId: string, companyId: string): Promise<void>;
}
