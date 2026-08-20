import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * M1.15 acceptance path (docs/product/milestones.md #m115): the bootstrap
 * administrator logs in through the browser, is forced to change the
 * password, creates a company, creates a project, grants an editor, and
 * that editor sees exactly that project on login — no seeded database, no
 * direct API setup. Every step below goes through the UI or the browser's
 * own fetch of the real API, never a database write.
 *
 * The full path cannot run today: company creation succeeds, but nothing in
 * the exposed API can make anyone that company's first Admin, so project
 * creation and invitation both deny. See the finding and candidate fixes at
 * docs/product/requirements/REQ-SEC.md#req-sec-014--instance-administration-capability.
 * `login and forced password change` below is the slice that already works
 * end-to-end; `bootstrap admin onboards a project and an editor sees only
 * that project` is written and ready to run once that gap closes.
 */

const bootstrapEmail = 'admin@e2e.test';
const bootstrapPassword = 'bootstrap-password-1';
const newAdminPassword = 'new-admin-password-1';

async function loginAndChangePassword(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(bootstrapEmail);
  await page.getByLabel('Password').fill(bootstrapPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('Current password').fill(bootstrapPassword);
  await page.getByLabel('New password').fill(newAdminPassword);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
}

test('bootstrap admin logs in and completes the forced first-login password change', async ({
  page,
}) => {
  await loginAndChangePassword(page);
  await expect(
    page.getByText('As an instance administrator, create a company to get started.'),
  ).toBeVisible();
});

test.fixme('bootstrap admin onboards a project and an editor sees only that project', async ({
  page,
  request,
}) => {
  const companySlug = `acme-${Date.now().toString(36)}`;
  const projectSlug = `docs-${Date.now().toString(36)}`;
  const editorEmail = `editor-${Date.now().toString(36)}@e2e.test`;
  const editorPassword = 'editor-password-1';

  await loginAndChangePassword(page);

  // Create a company and a project (no dedicated UI yet — M1.16 adds it —
  // so this exercises the same authenticated API the UI's mutations call,
  // through the browser's own session cookie, not a direct database write).
  const companyResponse = await page.request.post('/api/companies', {
    data: { name: 'Acme', slug: companySlug },
  });
  expect(companyResponse.ok()).toBe(true);
  const { companyId } = (await companyResponse.json()) as { companyId: string };

  // Blocked here today: the instance admin has no company membership and
  // cannot pass company.manage_projects for any company, including one
  // they just created. See REQ-SEC-014's finding.
  const projectResponse = await page.request.post('/api/projects', {
    data: { companyId, name: 'Docs', slug: projectSlug, platform: 'web' },
  });
  expect(projectResponse.ok()).toBe(true);
  const { id: projectId } = (await projectResponse.json()) as { id: string };

  // Invite and grant an editor.
  const inviteResponse = await page.request.post('/api/users/invite', {
    data: { companyId, email: editorEmail },
  });
  expect(inviteResponse.ok()).toBe(true);
  const { userId: editorUserId } = (await inviteResponse.json()) as { userId: string };

  const grantResponse = await page.request.put(
    `/api/projects/${projectId}/grants/${editorUserId}`,
    { data: { roleName: 'editor' } },
  );
  expect(grantResponse.ok()).toBe(true);

  // The editor sets their first password through the reset flow — the
  // same one-time link a real invitation email would carry — read
  // directly out of mailpit rather than asserted against separately.
  const resetRequestResponse = await request.post('/api/auth/password-reset/request', {
    data: { email: editorEmail, companyId },
  });
  expect(resetRequestResponse.ok()).toBe(true);
  const resetToken = await readLatestResetTokenFromMailpit(request, editorEmail);

  await page.context().clearCookies();
  await page.goto(`/password-reset/confirm?token=${resetToken}`);
  await page.getByLabel('New password').fill(editorPassword);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByText('Your password has been reset.')).toBeVisible();

  // The editor logs in and sees exactly the one project they were granted.
  await page.getByRole('link', { name: 'Continue to sign in' }).click();
  await page.getByLabel('Email address').fill(editorEmail);
  await page.getByLabel('Company ID').fill(companyId);
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
  await expect(page.getByText('Docs')).toBeVisible();
  await expect(page.getByText('web · ' + projectSlug)).toBeVisible();
  // Exactly one project is visible — the editor was granted exactly this one.
  await expect(page.getByRole('button', { name: 'Open project' })).toHaveCount(1);
});

/** Reads the raw reset token out of the last email mailpit received for the address. */
async function readLatestResetTokenFromMailpit(
  request: APIRequestContext,
  toEmail: string,
): Promise<string> {
  const mailpitBase = process.env.MAILPIT_API_BASE ?? 'http://127.0.0.1:8025';
  const search = await request.get(
    `${mailpitBase}/api/v1/search?query=${encodeURIComponent(`to:${toEmail}`)}`,
  );
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  const latest = messages[0];
  if (latest === undefined) {
    throw new Error(`No email received for ${toEmail}`);
  }
  const messageResponse = await request.get(`${mailpitBase}/api/v1/message/${latest.ID}`);
  const message = (await messageResponse.json()) as { Text: string };
  const match = /token=([a-zA-Z0-9_-]+)/.exec(message.Text);
  if (match?.[1] === undefined) {
    throw new Error('Reset email did not contain a token');
  }
  return match[1];
}
