import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '../lib/cn';

export function Label(props: ComponentProps<typeof LabelPrimitive.Root>): ReactElement {
  const { className, ...rest } = props;
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-sm font-medium leading-none text-[var(--color-ink)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  );
}
