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

  // The instance administrator holds no membership in the company they just
  // created (REQ-SEC-014), so creating a project in it needs an audited
  // step-up window first (ADR-0027) — the empty project list offers exactly
  // that as its next action.
  await page.getByRole('link', { name: 'Administer this company' }).click();
  await expect(page.getByRole('heading', { name: 'Administer this company' })).toBeVisible();
  await page.getByLabel('Password').fill(newAdminPassword);
  await page.getByRole('button', { name: 'Open step-up' }).click();

  // Opening the step-up window lands back on project creation for this company.
  await expect(page).toHaveURL(`/companies/${String(companyId)}/projects/new`);
  await page.getByLabel('Project name').fill('Docs');
  await page.getByLabel('Slug').fill(projectSlug);
  await page.getByLabel('Platform').selectOption('web');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByRole('heading', { name: 'Docs' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectId = /\/projects\/([^/]+)/.exec(page.url())?.[1];
  expect(projectId).toBeDefined();

  // Invite the editor into the company, then grant them a role on this project.
  // Two deliberate steps: the invite alone gives no project access at all. The
  // creator was auto-granted admin on project creation, so the access list is
  // never empty here — assert on that row instead of an empty-state message.
  // The company's own first Admin shares the instance administrator's email
  // (both were provisioned with `bootstrapEmail`) but is a distinct, ungranted
  // user, so a row for that email exists too — the Revoke button is unique to
  // the granted row and is what actually distinguishes them.
  await page.goto(`/companies/${String(companyId)}/projects/${String(projectId)}/access`);
  await expect(
    page.getByRole('button', { name: `Revoke access for ${bootstrapEmail}` }),
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

  // Grant the editor role. The invite made them an eligible-but-ungranted row
  // (REQ-SEC-012), so their combobox exists but starts with no role selected.
  const roleSelect = page.getByRole('combobox', { name: `Role for ${editorEmail}` });
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
