import type { ReactElement, ReactNode } from 'react';

import { Label } from './label';

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/**
 * Project-level composition over Input/Label/Select that wires the
 * accessible name, hint and error associations (aria-describedby,
 * role="alert") in one place — REQ-NFR-013 review checklist item
 * "error messages are associated with their fields".
 */
export function Field(props: FieldProps): ReactElement {
  const errorId = `${props.htmlFor}-error`;
  const hintId = `${props.htmlFor}-hint`;
  const describedBy =
    props.error !== undefined ? errorId : props.hint !== undefined ? hintId : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={props.htmlFor}>{props.label}</Label>
      <div aria-describedby={describedBy}>{props.children}</div>
      {props.hint !== undefined && props.error === undefined ? (
        <p className="text-sm text-[var(--color-muted)]" id={hintId}>
          {props.hint}
        </p>
      ) : null}
      {props.error !== undefined ? (
        <p className="text-sm font-medium text-[var(--color-danger)]" id={errorId} role="alert">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}
