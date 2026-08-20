import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn';

const alertVariants = cva('flex items-start gap-2 rounded-md border p-3 text-sm', {
  variants: {
    variant: {
      info: 'border-[var(--color-info)]/30 bg-[var(--color-info-surface)] text-[var(--color-info)]',
      success:
        'border-[var(--color-success)]/30 bg-[var(--color-success-surface)] text-[var(--color-success)]',
      error:
        'border-[var(--color-danger)]/30 bg-[var(--color-danger-surface)] text-[var(--color-danger)]',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

/**
 * Status is not communicated by color alone (review checklist): each variant
 * pairs its color with a distinct icon and an explicit ARIA role.
 */
export function Alert(props: AlertProps): ReactElement {
  const { className, variant = 'info', children, ...rest } = props;
  const Icon = icons[variant ?? 'info'];
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      role={variant === 'error' ? 'alert' : 'status'}
      {...rest}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
