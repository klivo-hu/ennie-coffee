'use client';

import { cn } from '@/lib/cn';

/** An on/off control exposed as a real switch, with its state in words beside it. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  showState = true,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  showState?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-control text-small text-ink disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-base',
          checked ? 'bg-sage-800' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 size-5 rounded-full bg-white shadow-soft transition-transform duration-base ease-out',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      {showState ? <span aria-hidden="true">{checked ? 'Látható' : 'Rejtett'}</span> : null}
    </button>
  );
}
