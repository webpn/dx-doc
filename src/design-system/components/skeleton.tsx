import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn';

export function Skeleton(props: HTMLAttributes<HTMLDivElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-[var(--color-surface-muted)]', className)}
      {...rest}
    />
  );
}
