import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';

import { CompanyCreatePage } from './company-create-page';

/**
 * REQ-SEC-014: creating a company provisions its first Admin in the same
 * operation, because a company with no Admin cannot be administered by anyone —
 * not even the instance administrator, who holds no company membership.
 *
 * The screen therefore cannot offer "create a company" without also collecting
 * that first Admin: the two are one operation, not a company followed by an
 * optional invitation.
 */

const createCompany = vi.fn();
const navigate = vi.fn();

vi.mock('../queries', () => ({
  useCreateCompany: () => ({
    mutateAsync: createCompany,
    isPending: false,
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigate };
});

beforeEach(() => {
  createCompany.mockReset();
  navigate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CompanyCreatePage', () => {
  it('collects the company and its first administrator together', async () => {
    const user = userEvent.setup();
    createCompany.mockResolvedValue({ companyId: 'cmp_1' });

    renderWithProviders(<CompanyCreatePage />);

    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.type(screen.getByLabelText('Slug'), 'acme');
    await user.type(screen.getByLabelText('First administrator email'), 'admin@acme.test');
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    await waitFor(() => {
      expect(createCompany).toHaveBeenCalledWith({
        name: 'Acme',
        slug: 'acme',
        firstAdmin: { email: 'admin@acme.test' },
      });
    });
  });

  it('sends no password so the first Admin must set one at first login', async () => {
    const user = userEvent.setup();
    createCompany.mockResolvedValue({ companyId: 'cmp_1' });

    renderWithProviders(<CompanyCreatePage />);

    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.type(screen.getByLabelText('Slug'), 'acme');
    await user.type(screen.getByLabelText('First administrator email'), 'admin@acme.test');
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    await waitFor(() => {
      expect(createCompany).toHaveBeenCalled();
    });
    // REQ-SEC-013 forces a password change at first login; the instance
    // administrator must never choose another person's password.
    const [payload] = createCompany.mock.calls[0] as [{ firstAdmin: { password?: string } }];
    expect(payload.firstAdmin.password).toBeUndefined();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });

  it('will not submit without a first administrator', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CompanyCreatePage />);

    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.type(screen.getByLabelText('Slug'), 'acme');
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    expect(createCompany).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter the email address of the first administrator.',
    );
  });

  it('surfaces a duplicate slug as a field-level message, not a raw API error', async () => {
    const user = userEvent.setup();
    const { ApiClientError } = await import('../api/client');
    createCompany.mockRejectedValue(
      new ApiClientError(409, { code: 'CONFLICT', message: 'slug already exists' }),
    );

    renderWithProviders(<CompanyCreatePage />);

    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.type(screen.getByLabelText('Slug'), 'acme');
    await user.type(screen.getByLabelText('First administrator email'), 'admin@acme.test');
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That slug is already taken. Choose another.',
    );
  });

  it('navigates to the new company on success', async () => {
    const user = userEvent.setup();
    createCompany.mockResolvedValue({ companyId: 'cmp_42' });

    renderWithProviders(<CompanyCreatePage />);

    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.type(screen.getByLabelText('Slug'), 'acme');
    await user.type(screen.getByLabelText('First administrator email'), 'admin@acme.test');
    await user.click(screen.getByRole('button', { name: 'Create company' }));

    // The instance administrator's session has `companyId: null` and creating a
    // company does not change that — they are still not a member of it. So the
    // company must travel in the URL, which the milestone already requires as
    // the source of truth for the selected company.
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/companies/cmp_42/projects');
    });
  });
});
