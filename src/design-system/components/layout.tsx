import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn';

/**
 * Application shell regions (ADR-0008: "Layout components" as a named
 * primitive category). Desktop-only per REQ-NFR-007 — no responsive
 * breakpoints below --breakpoint-min.
 */
export function AppShell(props: HTMLAttributes<HTMLDivElement>): ReactElement {
  const { className, ...rest } = props;
  return <div className={cn('min-h-screen bg-[var(--color-background)]', className)} {...rest} />;
}

export function AppHeader(props: HTMLAttributes<HTMLElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-8',
        className,
      )}
      {...rest}
    />
  );
}

export function AppMain(props: HTMLAttributes<HTMLElement>): ReactElement {
  const { className, ...rest } = props;
  return <main className={cn('mx-auto max-w-6xl px-8 py-10', className)} {...rest} />;
}
