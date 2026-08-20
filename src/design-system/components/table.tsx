import type { HTMLAttributes, ReactElement, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export function Table(props: HTMLAttributes<HTMLTableElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...rest} />
    </div>
  );
}

export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  const { className, ...rest } = props;
  return <thead className={cn('border-b border-[var(--color-border)]', className)} {...rest} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  const { className, ...rest } = props;
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...rest} />;
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <tr
      className={cn(
        'border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-muted)]',
        className,
      )}
      {...rest}
    />
  );
}

export function TableHead(props: ThHTMLAttributes<HTMLTableCellElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <th
      className={cn(
        'h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]',
        className,
      )}
      {...rest}
    />
  );
}

export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>): ReactElement {
  const { className, ...rest } = props;
  return <td className={cn('p-3 align-middle', className)} {...rest} />;
}
