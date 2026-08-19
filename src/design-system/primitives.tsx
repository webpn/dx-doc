import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode } from 'react';

import './tokens.css';
import './components.css';

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  },
): ReactElement {
  const { variant = 'primary', className = '', ...buttonProps } = props;
  return <button className={`ds-button ds-button-${variant} ${className}`} {...buttonProps} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>): ReactElement {
  const { className = '', ...inputProps } = props;
  return <input className={`ds-input ${className}`} {...inputProps} />;
}

export function Field(props: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}): ReactElement {
  const errorId = `${props.htmlFor}-error`;
  const hintId = `${props.htmlFor}-hint`;
  const describedBy = props.error ? errorId : props.hint ? hintId : undefined;
  return (
    <div className="ds-field">
      <label className="ds-label" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      <div aria-describedby={describedBy}>{props.children}</div>
      {props.hint && !props.error ? (
        <p className="ds-hint" id={hintId}>
          {props.hint}
        </p>
      ) : null}
      {props.error ? (
        <p className="ds-error" id={errorId} role="alert">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

export function Alert(props: {
  children: ReactNode;
  variant?: 'error' | 'success' | 'info';
}): ReactElement {
  return (
    <div
      className={`ds-alert ds-alert-${props.variant ?? 'info'}`}
      role={props.variant === 'error' ? 'alert' : 'status'}
    >
      {props.children}
    </div>
  );
}

export function Card(props: { children: ReactNode; className?: string }): ReactElement {
  return <section className={`ds-card ${props.className ?? ''}`}>{props.children}</section>;
}
