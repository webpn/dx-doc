import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn';

export function Card(props: HTMLAttributes<HTMLDivElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader(props: HTMLAttributes<HTMLDivElement>): ReactElement {
  const { className, ...rest } = props;
  return <div className={cn('mb-4 grid gap-1', className)} {...rest} />;
}

export function CardTitle(props: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <h2 className={cn('text-lg font-semibold text-[var(--color-ink)]', className)} {...rest} />
  );
}

export function CardDescription(props: HTMLAttributes<HTMLParagraphElement>): ReactElement {
  const { className, ...rest } = props;
  return <p className={cn('text-sm text-[var(--color-muted)]', className)} {...rest} />;
}
