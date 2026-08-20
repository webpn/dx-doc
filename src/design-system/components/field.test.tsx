import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('associates the hint with the input via aria-describedby', () => {
    render(
      <Field hint="Use at least eight characters." htmlFor="password" label="Password">
        <Input id="password" />
      </Field>,
    );

    const input = screen.getByLabelText('Password');
    const hint = screen.getByText('Use at least eight characters.');
    expect(input.parentElement).toHaveAttribute('aria-describedby', hint.id);
  });

  it('associates the error with the input and announces it via role=alert', () => {
    render(
      <Field error="This value is required." htmlFor="email" label="Email">
        <Input id="email" />
      </Field>,
    );

    const input = screen.getByLabelText('Email');
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('This value is required.');
    expect(input.parentElement).toHaveAttribute('aria-describedby', error.id);
  });

  it('prefers the error over the hint when both are present', () => {
    render(
      <Field error="Required." hint="A hint." htmlFor="name" label="Name">
        <Input id="name" />
      </Field>,
    );

    expect(screen.queryByText('A hint.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required.');
  });
});
