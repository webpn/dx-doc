import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { AccountRepository } from '../ports/account-repository';
import type { ServiceTokenRepository } from '../ports/service-token-repository';

import { generateSessionToken, hashSessionToken } from './tokens';

export type ServiceTokenError = { kind: 'forbidden' } | { kind: 'not_found' } | { kind: 'invalid_input' };

/**
 * Default service-token lifetime. A constant, deliberately not an environment
 * variable: token expiry is a per-token property once issuance accepts a TTL
 * (REQ-API-009); a single instance-wide default covers the first half of
 * M1.12 and is replaced when per-token TTLs land. 30 days suits the import
 * workload, which authenticates scripted runs that can span days.
 */
export const DEFAULT_SERVICE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Read model for listing — the token hash never leaves the store (REQ-SEC-017 shape). */
export interface ServiceTokenReadModel {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  /** Derived: usable = not revoked and not expired. */
  active: boolean;
}

export interface IssuedServiceToken {
  tokenId: string;
  /** The raw token value — shown exactly once, at issuance. */
  token: string;
  expiresAt: string;
}

/**
 * Service-account API tokens (REQ-API-009): non-interactive authentication
 * bound to a user identity, with their own lifecycle independent of the
 * owner's session. A token carries no privilege its owner lacks — resolving
 * yields the owner's user id and every permission check is unchanged.
 */
export class ServiceTokenService {
  constructor(
    private readonly tokens: ServiceTokenRepository,
    private readonly accounts: AccountRepository,
    private readonly ttlMs: number = DEFAULT_SERVICE_TOKEN_TTL_MS,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  /** Issue a token bound to the caller's own identity. */
  async issue(userId: string, name: string): Promise<Result<IssuedServiceToken, ServiceTokenError>> {
    const user = await this.accounts.getUserById(userId);
    if (user === null || !user.active) {
      return err({ kind: 'forbidden' });
    }
    const trimmed = name.trim();
    if (trimmed === '') {
      return err({ kind: 'invalid_input' });
    }
    const token = generateSessionToken();
    const nowIso = this.now().toISOString();
    const expiresAt = new Date(this.now().getTime() + this.ttlMs).toISOString();
    const tokenId = this.newId();
    await this.tokens.create({
      id: tokenId,
      userId,
      name: trimmed,
      tokenHash: hashSessionToken(token),
      createdAt: nowIso,
      expiresAt,
    });
    return ok({ tokenId, token, expiresAt });
  }

  /** List the caller's own tokens. No token value is ever returned. */
  async list(userId: string): Promise<ServiceTokenReadModel[]> {
    const records = await this.tokens.listForUser(userId);
    const nowMs = this.now().getTime();
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      active: record.revokedAt === null && Date.parse(record.expiresAt) > nowMs,
    }));
  }

  /** Revoke one of the caller's own tokens; another user's token is not found. */
  async revoke(
    userId: string,
    tokenId: string,
  ): Promise<Result<{ ok: true }, ServiceTokenError>> {
    const records = await this.tokens.listForUser(userId);
    const token = records.find((candidate) => candidate.id === tokenId);
    if (token === undefined) {
      return err({ kind: 'not_found' });
    }
    await this.tokens.revoke(tokenId, this.now().toISOString());
    return ok({ ok: true });
  }

  /**
   * Resolve a raw token value to a user id, or null. Checks, per request:
   * stored hash match, not revoked, not expired, and the owning user is still
   * active — so a revoked token or a deactivated owner's token dies within one
   * request (REQ-API-009, REQ-SEC-013).
   */
  async resolve(token: string): Promise<string | null> {
    const record = await this.tokens.findByTokenHash(hashSessionToken(token));
    if (record === null) {
      return null;
    }
    if (record.revokedAt !== null) {
      return null;
    }
    if (Date.parse(record.expiresAt) <= this.now().getTime()) {
      return null;
    }
    const user = await this.accounts.getUserById(record.userId);
    if (user === null || !user.active) {
      return null;
    }
    return user.id;
  }
}
