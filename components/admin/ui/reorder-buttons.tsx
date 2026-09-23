'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';

/**
 * Move-up / move-down controls. Buttons rather than drag handles: they work from the keyboard
 * and with a screen reader, and on a phone without precision dragging.
 */
export function ReorderButtons({
  label,
  isFirst,
  isLast,
  disabled,
  onMove,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const button =
    'inline-flex size-9 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-30';
  return (
    <div className="flex items-center">
      <button
        type="button"
        className={button}
        disabled={disabled || isFirst}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">{label} feljebb</span>
      </button>
      <button
        type="button"
        className={button}
        disabled={disabled || isLast}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">{label} lejjebb</span>
      </button>
    </div>
  );
}

/** Returns a copy of `ids` with the item at `index` moved one step. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}
