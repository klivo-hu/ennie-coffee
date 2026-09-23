'use client';

import { useEffect, useId, useRef } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Modal built on the native <dialog>: `showModal()` gives focus containment, Escape to close,
 * and an inert page behind it without any script of our own. Used only where the task needs
 * protected focus — editing a record.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-panel bg-white p-0 text-ink shadow-lift backdrop:bg-ink/40',
        size === 'md' ? 'max-w-xl' : 'max-w-3xl',
      )}
    >
      {open ? (
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <h2 id={titleId} className="font-display text-display-md text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-paper hover:text-ink"
            >
              <CloseIcon className="size-5" />
              <span className="sr-only">Bezárás</span>
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
