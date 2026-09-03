import { expect, type APIRequestContext, type Page } from '@playwright/test';

const bootstrapEmail = 'admin@e2e.test';
const bootstrapPassword = 'bootstrap-password-1';
const newAdminPassword = 'new-admin-password-1';

/** Logs in using either the bootstrap password or the password already changed in this run. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(bootstrapEmail);
  await page.getByLabel('Password').fill(bootstrapPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const changePasswordHeading = page.getByRole('heading', { name: 'Choose a new password' });
  const projectsHeading = page.getByRole('heading', { name: 'Your projects' });
  const invalidCredentials = page.getByText('Invalid email or password.');
  await expect(changePasswordHeading.or(projectsHeading).or(invalidCredentials)).toBeVisible();

  if (await invalidCredentials.isVisible()) {
    await page.getByLabel('Password').fill(newAdminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(projectsHeading).toBeVisible();
    return;
  }

  await page.getByLabel('Current password').fill(bootstrapPassword);
  await page.getByLabel('New password').fill(newAdminPassword);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(projectsHeading).toBeVisible();
}

/** Reads the raw reset token from the latest invitation email in Mailpit. */
export async function readLatestResetTokenFromMailpit(
  request: APIRequestContext,
  toEmail: string,
): Promise<string> {
  const mailpitBase = process.env.MAILPIT_API_BASE ?? 'http://127.0.0.1:8025';
  const search = await request.get(
    `${mailpitBase}/api/v1/search?query=${encodeURIComponent(`to:${toEmail}`)}`,
  );
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  const latest = messages[0];
  if (latest === undefined) throw new Error(`No email received for ${toEmail}`);
  const messageResponse = await request.get(`${mailpitBase}/api/v1/message/${latest.ID}`);
  const message = (await messageResponse.json()) as { Text: string };
  const match = /token=([a-zA-Z0-9_-]+)/.exec(message.Text);
  if (match?.[1] === undefined) throw new Error('Reset email did not contain a token');
  return match[1];
}
