'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'success' | 'error';
interface Toast {
  readonly id: number;
  readonly tone: Tone;
  readonly message: string;
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

const VISIBLE_MS = 4_500;

/**
 * Short confirmations ("Mentve") and failures, announced through a live region so screen-reader
 * users hear them without losing their place. Errors stay polite but longer.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const notify = useCallback((message: string, tone: Tone = 'success') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      tone === 'error' ? VISIBLE_MS * 2 : VISIBLE_MS,
    );
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:left-auto"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className={cn(
              'pointer-events-auto max-w-sm rounded-control px-4 py-3 text-small font-medium shadow-lift motion-safe:animate-fade-in',
              toast.tone === 'success' ? 'bg-sage-900 text-ivory' : 'bg-danger text-white',
            )}
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
