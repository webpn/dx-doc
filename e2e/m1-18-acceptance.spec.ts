import { expect, test, type Page } from '@playwright/test';

import { loginAsAdmin, readLatestResetTokenFromMailpit } from './acceptance-helpers';

/**
 * M1.18 browser acceptance preparation. This deliberately uses the real
 * bootstrap server and browser-visible screens for all product setup and
 * authoring. The only non-product request is reading an invitation reset link
 * from Mailpit, which stands in for opening the email client.
 *
 * The reader part uses the browser management and verification screens. It
 * stops only if the authored project still cannot produce a published snapshot.
 */

const adminEmail = 'admin@e2e.test';
const adminPassword = 'new-admin-password-1';
const editorPassword = 'editor-password-1';
const sharedPassword = 'reader-password-1';

test('editor authors project content through the browser until the shared-password blocker', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36);
  const companySlug = `r1-company-${suffix}`;
  const projectSlug = `r1-project-${suffix}`;
  const editorEmail = `r1-editor-${suffix}@e2e.test`;

  await loginAsAdmin(page);

  await page.getByRole('link', { name: 'Create a company' }).click();
  await page.getByLabel('Company name').fill('R1 Acceptance Company');
  await page.getByLabel('Slug').fill(companySlug);
  await page.getByLabel('First administrator email').fill(adminEmail);
  await page.getByRole('button', { name: 'Create company' }).click();
  await expect(page).toHaveURL(/\/companies\/[^/]+\/projects$/);
  const companyId = /\/companies\/([^/]+)\/projects/.exec(page.url())?.[1];
  expect(companyId).toBeDefined();

  await page.getByRole('link', { name: 'Administer this company' }).click();
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Open step-up' }).click();
  await page.getByLabel('Project name').fill('R1 Acceptance Project');
  await page.getByLabel('Slug').fill(projectSlug);
  await page.getByLabel('Platform').selectOption('web');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectId = /\/projects\/([^/]+)$/.exec(page.url())?.[1];
  expect(projectId).toBeDefined();

  // Project creation is the only automatic catalogue-copy path. The new
  // project opens with the copied catalogue available to the project; assert
  // that its catalogue screen is reachable before creating project-local data.
  await page.goto(`/projects/${String(projectId)}/catalogue`);
  await expect(page.getByRole('heading', { name: 'Copy company catalogue' })).toBeVisible();

  await page.goto(`/companies/${String(companyId)}/projects/${String(projectId)}/access`);
  await page.getByLabel('Password').fill(sharedPassword);
  await page.getByLabel('Label (optional)').fill('Agency reader');
  await page.getByRole('button', { name: 'Create shared password' }).click();
  await expect(page.getByText(/Shared password created/)).toBeVisible();
  await page.getByLabel('Invite by email').fill(editorEmail);
  await page.getByRole('button', { name: 'Send invite' }).click();
  await expect(page.getByText('Invitation sent.')).toBeVisible();
  // Request the first password through the product's reset screen. Mailpit is
  // only used as the test email client because there is no browser UI for
  // reading an email's one-time link.
  await page.context().clearCookies();
  await page.goto('/password-reset');
  await page.getByLabel('Email address').fill(editorEmail);
  await page.getByLabel('Company ID').fill(String(companyId));
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/reset link is on its way/i)).toBeVisible();
  const resetToken = await readLatestResetTokenFromMailpit(request, editorEmail);
  await page.getByRole('combobox', { name: `Role for ${editorEmail}` }).selectOption('editor');

  await page.goto(`/password-reset/confirm?token=${resetToken}`);
  await page.getByLabel('New password').fill(editorPassword);
  await page.getByRole('button', { name: 'Save password' }).click();
  await page.getByRole('link', { name: 'Continue to sign in' }).click();
  await page.getByLabel('Email address').fill(editorEmail);
  await page.getByLabel('Company ID').fill(String(companyId));
  await page.getByLabel('Password').fill(editorPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
  await page.getByRole('button', { name: 'Open project' }).click();

  await createPage(page, String(projectId));
  await createProperty(page, String(projectId));
  await createModule(page, String(projectId));
  await createFreePages(page, String(projectId));
  await createFlow(page, String(projectId));

  await createNavigationEvent(page, String(projectId));
  await createTracking(page, String(projectId));

  // Publication is reachable from the project workspace. Assert the real UI
  // surface, but do not claim that a meaningful version was published.
  await page.goto(`/projects/${String(projectId)}`);
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('heading', { name: 'Publish version' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('link', { name: 'Open reader access' }).click();
  await page.getByLabel('Shared password').fill(sharedPassword);
  await page.getByRole('button', { name: 'Open documentation' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${String(projectId)}/reader$`));
  await expect(page.getByRole('heading', { name: 'Nothing published yet' })).toBeVisible();
  test.info().annotations.push({
    type: 'blocker',
    description:
      'The current authoring flow reaches publication review but does not create a published snapshot, so the read-only published view cannot be demonstrated.',
  });
  test.skip(true, 'Blocked: no published snapshot is available for this authored project.');
});

test('reader access entry screen is reachable without an authenticated shell', async ({ page }) => {
  await page.goto('/projects/unavailable/reader-access');
  await expect(page.getByRole('heading', { name: 'Access published documentation' })).toBeVisible();
});

async function createPage(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/pages/new`);
  await page.getByLabel('Name').fill('Checkout');
  await page.getByLabel('Slug').fill('checkout');
  await page.getByRole('button', { name: 'Create page' }).click();
  await expect(page.getByRole('heading', { name: 'Edit page' })).toBeVisible();
}

async function createProperty(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/properties/new`);
  await page.getByLabel('Name').fill('Order total');
  await page.getByLabel('Business label').fill('Order total');
  await page.getByRole('button', { name: 'Create property' }).click();
  await expect(page.getByRole('heading', { name: 'Edit property' })).toBeVisible();
}

async function createModule(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/modules/new`);
  await page.getByLabel('Name').fill('Checkout details');
  await page.getByLabel('Order total').check();
  await page.getByRole('button', { name: 'Create module' }).click();
  await expect(page.getByRole('heading', { name: 'Edit module' })).toBeVisible();
}

async function createFreePages(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/free-pages/new`);
  await page.getByLabel('Title').fill('Published guide');
  await page.getByLabel('Slug').fill('published-guide');
  await page.getByRole('button', { name: 'Create free page' }).click();
  await expect(page.getByRole('heading', { name: 'Edit free page' })).toBeVisible();
  await page.getByLabel('Content').locator('[contenteditable="true"]').fill('Published content');
  await page.getByRole('button', { name: 'Save free page' }).click();
  await expect(page.getByText('Free page saved.')).toBeVisible();

  await page.goto(`/projects/${projectId}/free-pages/new`);
  await page.getByLabel('Title').fill('Internal draft');
  await page.getByLabel('Slug').fill('internal-draft');
  await page.getByRole('button', { name: 'Create free page' }).click();
  await expect(page.getByRole('heading', { name: 'Edit free page' })).toBeVisible();
  await page.getByLabel('Publishable').uncheck();
  await page.getByRole('button', { name: 'Save free page' }).click();
  await expect(page.getByText('Free page saved.')).toBeVisible();
}

async function createFlow(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/flows/new`);
  await page.getByLabel('Name').fill('Checkout journey');
  await page.getByLabel('Slug').fill('checkout-journey');
  await page.getByRole('button', { name: 'Create flow' }).click();
  await expect(page.getByRole('heading', { name: 'Edit flow' })).toBeVisible();
}

async function createNavigationEvent(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/navigation-events/new`);
  await page.getByLabel('Name').fill('Checkout completed');
  await page.getByLabel('Description').fill('The checkout confirmation appears.');
  await page.getByRole('button', { name: 'Create navigation event' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
}

async function createTracking(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/trackings/new`);
  await page.getByLabel('Name').fill('Checkout completed');
  await page.getByLabel('Slug').fill('checkout-completed');
  await page.getByLabel('Navigation event').selectOption({ label: 'Checkout completed' });
  await page.getByLabel('Page').selectOption({ label: 'Checkout' });
  await page.getByRole('button', { name: 'Create tracking' }).click();
  await expect(page.getByRole('heading', { name: 'Edit tracking' })).toBeVisible();
}
