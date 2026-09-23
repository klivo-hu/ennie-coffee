'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultGrants } from '@/lib/consent/config';
import { readConsent, writeConsent, type ConsentState } from '@/lib/consent/store';

interface ConsentContextValue {
  /** True once a current decision exists. Until then, nothing non-essential may run. */
  readonly decided: boolean;
  /** False until the stored decision has been read on the client. */
  readonly ready: boolean;
  /** True while the window is open because the visitor reopened it. */
  readonly open: boolean;
  readonly grants: Readonly<Record<string, boolean>>;
  readonly allows: (categoryId: string) => boolean;
  readonly save: (granted: Record<string, boolean>) => void;
  readonly openWindow: () => void;
  readonly close: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

/**
 * Holds the consent decision for the app.
 *
 * The provider starts denied and stays denied until a stored decision is read on the client. That
 * ordering is the whole point: server render and first paint must never assume permission that has
 * not been given.
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  // The stored decision lives in a cookie only the browser can read at this point; reading it is
  // the one thing this effect does.
  useEffect(() => {
    setState(readConsent());
    setReady(true);
  }, []);

  const save = useCallback((granted: Record<string, boolean>) => {
    setState(writeConsent(granted));
    setOpen(false);
  }, []);

  const grants = useMemo(() => state?.granted ?? defaultGrants(), [state]);

  const value = useMemo<ConsentContextValue>(
    () => ({
      decided: state !== null,
      ready,
      open,
      grants,
      allows: (categoryId: string) => grants[categoryId] === true,
      save,
      openWindow: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [state, ready, open, grants, save],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used inside <ConsentProvider>.');
  }
  return context;
}
