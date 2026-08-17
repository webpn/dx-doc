/**
 * Session persistence port (D18: cookie-based server sessions, state in the
 * database). Only the SHA-256 of the token is stored; the raw cookie value
 * never reaches persistence.
 */
export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface SessionRepository {
  save(session: SessionRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  /** Remove sessions whose expiry is at or before `nowIso`. */
  deleteExpired(nowIso: string): Promise<void>;
}
