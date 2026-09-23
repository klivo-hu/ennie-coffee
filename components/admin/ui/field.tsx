'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

const control =
  'block w-full rounded-control border border-line-strong bg-white px-3 text-body text-ink placeholder:text-ink-soft/70 transition-colors duration-fast focus:border-sage-700 focus:outline-none focus:ring-2 focus:ring-sage-700/20 disabled:bg-paper disabled:text-ink-soft aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15';

interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly className?: string;
  readonly children: (props: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => React.ReactNode;
}

/**
 * Label, control, hint, and error wired together: the label names the control, and the hint
 * and error are announced with it (aria-describedby). Errors are text, never color alone.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-caption text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-11', className)}
      {...props}
    />
  );
}

export function TextArea({
  className,
  invalid,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(control, 'min-h-24 py-2.5', className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-11 pr-8', className)}
      {...props}
    >
      {children}
    </select>
  );
}

/** A form-level error summary, announced when it appears. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-control bg-danger-soft px-4 py-3 text-small font-medium text-danger"
    >
      {message}
    </p>
  );
}
