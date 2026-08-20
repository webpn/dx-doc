import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>): ReactElement {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-[var(--z-index-dialog)] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...rest}
    />
  );
}

export function DialogContent(props: ComponentProps<typeof DialogPrimitive.Content>): ReactElement {
  const { className, children, ...rest } = props;
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[var(--z-index-dialog)] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-popover)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...rest}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader(props: HTMLAttributes<HTMLDivElement>): ReactElement {
  const { className, ...rest } = props;
  return <div className={cn('grid gap-1.5 text-left', className)} {...rest} />;
}

export function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>): ReactElement {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-[var(--color-ink)]', className)}
      {...rest}
    />
  );
}

export function DialogDescription(
  props: ComponentProps<typeof DialogPrimitive.Description>,
): ReactElement {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-[var(--color-muted)]', className)}
      {...rest}
    />
  );
}

export function DialogFooter(props: HTMLAttributes<HTMLDivElement>): ReactElement {
  const { className, ...rest } = props;
  return <div className={cn('flex justify-end gap-2', className)} {...rest} />;
}
