import { describe, expect, it } from 'vitest';

import { SmtpEmailSender } from './smtp-email-sender';

/**
 * Integration test against a real SMTP catcher (Mailpit) — no mocking at the
 * infrastructure level (ADR-0017). Opt in by setting SMTP_TEST_HOST; CI
 * provides a Mailpit service so the suite always runs there.
 */
const TEST_HOST = process.env.SMTP_TEST_HOST;
const TEST_PORT = Number(process.env.SMTP_TEST_PORT ?? 1025);
const RUN_INTEGRATION = TEST_HOST !== undefined;

describe('SmtpEmailSender (against a real SMTP catcher)', () => {
  it.runIf(RUN_INTEGRATION)('delivers a message to the SMTP catcher', async () => {
    if (TEST_HOST === undefined) {
      throw new Error('SMTP_TEST_HOST must be set');
    }
    const sender = new SmtpEmailSender({
      host: TEST_HOST,
      port: TEST_PORT,
      user: undefined,
      password: undefined,
      secure: false,
      from: 'noreply@dx.test',
    });

    // A successful SMTP round-trip: Mailpit accepts the message; a delivery
    // failure would reject here. (Recipient is fictional — the catcher keeps it.)
    await expect(
      sender.send({
        to: 'recipient@example.com',
        subject: 'dx-doc test',
        text: 'hello from the integration suite',
      }),
    ).resolves.toBeUndefined();
  });

  it.runIf(!RUN_INTEGRATION)('is skipped when no SMTP catcher is configured', () => {
    expect(TEST_HOST).toBeUndefined();
  });
});
