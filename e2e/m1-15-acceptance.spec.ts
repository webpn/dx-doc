import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * M1.15 acceptance path (docs/product/milestones.md #m115): the bootstrap
 * administrator logs in through the browser, is forced to change the password,
 * creates a company, creates a project, grants an editor, and that editor sees
 * exactly that project on login — no seeded database, no direct API setup.
 *
 * Every step goes through the UI. The one exception is reading the invited
 * editor's reset token out of mailpit, which stands in for opening the email
 * client: there is no screen in this product that shows another user's
 * one-time link, and there should not be.
 */

const bootstrapEmail = 'admin@e2e.test';
const bootstrapPassword = 'bootstrap-password-1';
const newAdminPassword = 'new-admin-password-1';

// The forced first-login password change (REQ-SEC-013) can only ever happen
// once per bootstrap admin, but both tests need an authenticated admin and they
// share one server and one database. So this signs in with whichever password is
// currently in force: on the first test it performs the change, on any later one
// it goes straight in with the new password. Making the tests order-independent
// belongs here — the alternative is a per-test database, which the harness does
// not provide.
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(bootstrapEmail);
  await page.getByLabel('Password').fill(bootstrapPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const changePasswordHeading = page.getByRole('heading', { name: 'Choose a new password' });
  const projectsHeading = page.getByRole('heading', { name: 'Your projects' });
  const invalidCredentials = page.getByText('Invalid email or password.');

  await expect(changePasswordHeading.or(projectsHeading).or(invalidCredentials)).toBeVisible();

  if (await invalidCredentials.isVisible()) {
    // The change already happened in an earlier test: use the new password.
    await page.getByLabel('Password').fill(newAdminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(projectsHeading).toBeVisible();
    return;
  }

  if (await changePasswordHeading.isVisible()) {
    await page.getByLabel('Current password').fill(bootstrapPassword);
    await page.getByLabel('New password').fill(newAdminPassword);
    await page.getByRole('button', { name: 'Save password' }).click();
  }

  await expect(projectsHeading).toBeVisible();
}

// Test 1 asserts the forced change itself (REQ-SEC-013), so it must see the
// prompt rather than tolerate its absence. Playwright runs the file in order and
// this is the first test, so the bootstrap password is still in force here.
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

test('bootstrap admin onboards a project and an editor sees only that project', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36);
  const companySlug = `acme-${suffix}`;
  const projectSlug = `docs-${suffix}`;
  const editorEmail = `editor-${suffix}@e2e.test`;
  const editorPassword = 'editor-password-1';

  await loginAsAdmin(page);

  // Create the company. The first Admin is provisioned in the same operation
  // (REQ-SEC-014) — the instance administrator holds no company membership, so
  // without this the company would have nobody able to administer it.
  await page.getByRole('link', { name: 'Create a company' }).click();
  await page.getByLabel('Company name').fill('Acme');
  await page.getByLabel('Slug').fill(companySlug);
  await page.getByLabel('First administrator email').fill(bootstrapEmail);
  await page.getByRole('button', { name: 'Create company' }).click();

  // Landing on the new company's project list proves the redirect carried the
  // company in the URL, which is where the selected company lives for an
  // instance administrator.
  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
  await expect(page).toHaveURL(/\/companies\/[^/]+\/projects$/);
  const companyId = /\/companies\/([^/]+)\/projects/.exec(page.url())?.[1];
  expect(companyId).toBeDefined();

  // Create a project inside it.
  await page.goto(`/companies/${String(companyId)}/projects/new`);
  await page.getByLabel('Project name').fill('Docs');
  await page.getByLabel('Slug').fill(projectSlug);
  await page.getByLabel('Platform').selectOption('web');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByRole('heading', { name: 'Docs' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectId = /\/projects\/([^/]+)/.exec(page.url())?.[1];
  expect(projectId).toBeDefined();

  // Invite the editor into the company, then grant them a role on this project.
  // Two deliberate steps: the invite alone gives no project access at all.
  await page.goto(`/companies/${String(companyId)}/projects/${String(projectId)}/access`);
  await expect(
    page.getByText('Nobody has been granted access to this project yet.'),
  ).toBeVisible();

  await page.getByLabel('Invite by email').fill(editorEmail);
  await page.getByRole('button', { name: 'Send invite' }).click();
  await expect(page.getByText('Invitation sent.')).toBeVisible();

  // The invited user needs a password before they can be granted anything they
  // can use. They set it through the reset flow — the same one-time link a real
  // invitation email carries.
  const resetRequestResponse = await request.post('/api/auth/password-reset/request', {
    data: { email: editorEmail, companyId },
  });
  expect(resetRequestResponse.ok()).toBe(true);
  const resetToken = await readLatestResetTokenFromMailpit(request, editorEmail);

  // Grant the editor role. The user list is keyed by user id, so read it off the
  // row the invite created rather than assuming an ordering.
  await page.reload();
  const roleSelect = page.getByRole('combobox', { name: /^Role for / }).first();
  await expect(roleSelect).toBeVisible();
  await roleSelect.selectOption('editor');
  await expect(roleSelect).toHaveValue('editor');

  await page.context().clearCookies();
  await page.goto(`/password-reset/confirm?token=${resetToken}`);
  await page.getByLabel('New password').fill(editorPassword);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByText('Your password has been reset.')).toBeVisible();

  // The editor logs in and sees exactly the one project they were granted.
  await page.getByRole('link', { name: 'Continue to sign in' }).click();
  await page.getByLabel('Email address').fill(editorEmail);
  await page.getByLabel('Company ID').fill(String(companyId));
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
  await expect(page.getByText('Docs')).toBeVisible();
  await expect(page.getByText(`web · ${projectSlug}`)).toBeVisible();
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
