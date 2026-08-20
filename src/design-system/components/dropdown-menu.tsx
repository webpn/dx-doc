import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '../lib/cn';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent(
  props: ComponentProps<typeof DropdownMenuPrimitive.Content>,
): ReactElement {
  const { className, sideOffset = 4, ...rest } = props;
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          'z-[var(--z-index-dropdown)] min-w-[10rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-ink)] shadow-[var(--shadow-popover)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        sideOffset={sideOffset}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem(
  props: ComponentProps<typeof DropdownMenuPrimitive.Item>,
): ReactElement {
  const { className, ...rest } = props;
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[var(--color-surface-muted)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...rest}
    />
  );
}

export function DropdownMenuCheckboxItem(
  props: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>,
): ReactElement {
  const { className, children, ...rest } = props;
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-[var(--color-surface-muted)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...rest}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel(
  props: ComponentProps<typeof DropdownMenuPrimitive.Label>,
): ReactElement {
  const { className, ...rest } = props;
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2 py-1.5 text-xs font-semibold text-[var(--color-muted)]', className)}
      {...rest}
    />
  );
}

export function DropdownMenuSeparator(
  props: ComponentProps<typeof DropdownMenuPrimitive.Separator>,
): ReactElement {
  const { className, ...rest } = props;
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-[var(--color-border)]', className)}
      {...rest}
    />
  );
}

export function DropdownMenuSubTrigger(
  props: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>,
): ReactElement {
  const { className, children, ...rest } = props;
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[var(--color-surface-muted)] data-[state=open]:bg-[var(--color-surface-muted)]',
        className,
      )}
      {...rest}
    >
      {children}
      <ChevronRight className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent(
  props: ComponentProps<typeof DropdownMenuPrimitive.SubContent>,
): ReactElement {
  const { className, ...rest } = props;
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          'z-[var(--z-index-dropdown)] min-w-[8rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-ink)] shadow-[var(--shadow-popover)]',
          className,
        )}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
