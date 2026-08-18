/**
 * Service-account API token persistence (REQ-API-009).
 *
 * A token is bound to a user identity and has its own lifecycle — issued,
 * listed, revoked, expiring — independent of the owner's session. Only the
 * SHA-256 of the token is stored, the same rule as session and reset tokens:
 * the raw value exists exactly once, in the issuance response.
 */
export interface ApiServiceToken {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  /** Set when the owner revokes the token; a revoked token stops resolving. */
  revokedAt: string | null;
}

export interface NewServiceToken {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

export interface ServiceTokenRepository {
  create(token: NewServiceToken): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<ApiServiceToken | null>;
  listForUser(userId: string): Promise<ApiServiceToken[]>;
  /** Mark a token revoked; it stops resolving on the next request. */
  revoke(id: string, revokedAtIso: string): Promise<void>;
}
