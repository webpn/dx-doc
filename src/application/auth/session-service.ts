import { randomUUID } from 'node:crypto';

import type { SessionRecord, SessionRepository } from '../ports/session-repository';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import { generateSessionToken, hashSessionToken } from './tokens';

export interface NewSession {
  sessionId: string;
  /** The raw cookie value handed to the browser (never stored). */
  token: string;
  expiresAt: string;
}

/**
 * Create, resolve and destroy database-backed sessions (D18). The token is the
 * cookie; the store holds only its hash.
 */
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly ttlMs: number,
    private readonly auditLogs: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async create(userId: string): Promise<NewSession> {
    const token = generateSessionToken();
    const session: SessionRecord = {
      id: this.newId(),
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(this.now().getTime() + this.ttlMs).toISOString(),
      createdAt: this.now().toISOString(),
    };
    await this.sessions.save(session);
    return { sessionId: session.id, token, expiresAt: session.expiresAt };
  }

  /** Resolve a cookie token to a user id, or null if absent/expired. */
  async resolve(token: string): Promise<string | null> {
    const record = await this.sessions.findByTokenHash(hashSessionToken(token));
    if (record === null) {
      return null;
    }
    if (Date.parse(record.expiresAt) <= this.now().getTime()) {
      await this.sessions.deleteByTokenHash(record.tokenHash);
      return null;
    }
    return record.userId;
  }

  async destroy(token: string, userId: string | null, companyId: string | null): Promise<void> {
    await this.sessions.deleteByTokenHash(hashSessionToken(token));

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId,
      projectId: null,
      actorId: userId ?? 'unknown',
      action: 'session.logout',
      entityType: 'session',
      entityId: null,
      details: {},
      createdAt: nowIso,
      actorKind: 'session',
    });
  }
}
