import type { InputHTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn';

export function Input(props: InputHTMLAttributes<HTMLInputElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-danger)] aria-invalid:ring-[var(--color-danger)]',
        className,
      )}
      {...rest}
    />
  );
}
