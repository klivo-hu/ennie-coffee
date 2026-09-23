'use client';

import { Link } from '@/components/ui/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useConsent } from '@/components/consent/consent-provider';
import {
  CONSENT_COPY,
  CONSENT_POLICY_PATH,
  CONSENT_SHOW_PURPOSES_UP_FRONT,
  OPTIONAL_CATEGORIES,
  allGranted,
  defaultGrants,
} from '@/lib/consent/config';

/**
 * The consent window: a small card in the bottom-left corner that does not cover the page.
 *
 * It renders only once the stored decision has been read (so a returning visitor never sees it
 * flash), and only when no current decision exists or the visitor reopened it. Accept and refuse
 * are the same control at the same weight, side by side — a quieter refuse button would be a dark
 * pattern, not a style choice.
 */
export function ConsentWindow() {
  const { decided, ready, open, grants, save, close } = useConsent();
  const [purposesVisible, setPurposesVisible] = useState(CONSENT_SHOW_PURPOSES_UP_FRONT);
  const [draft, setDraft] = useState<Record<string, boolean>>(defaultGrants);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const visible = ready && (open || !decided);

  // Reopening shows what is currently allowed rather than a fresh set of defaults.
  useEffect(() => {
    if (visible) setDraft({ ...grants });
  }, [visible, grants]);

  // Escape closes without granting anything: silence is not agreement.
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, close]);

  // A reopened window takes focus so keyboard users land on the choice they asked for.
  useEffect(() => {
    if (visible && open) dialogRef.current?.focus();
  }, [visible, open]);

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      className="fixed inset-x-3 bottom-3 z-50 rounded-panel bg-white p-5 shadow-lift motion-safe:animate-fade-in sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[26rem] sm:p-6"
    >
      <h2 id={titleId} className="font-display text-title text-ink">
        {CONSENT_COPY.title}
      </h2>
      <p id={bodyId} className="mt-2 text-small text-ink-soft">
        {CONSENT_COPY.body}
      </p>

      {purposesVisible ? (
        <fieldset className="mt-4 space-y-3 border-t border-line pt-4">
          <legend className="sr-only">{CONSENT_COPY.preferencesTitle}</legend>
          {OPTIONAL_CATEGORIES.map((category) => (
            <label key={category.id} className="flex cursor-pointer gap-3 text-small text-ink">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-sage-800"
                checked={draft[category.id] === true}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [category.id]: event.target.checked }))
                }
              />
              <span>
                <span className="font-medium">{category.label}</span>
                <span className="mt-1 block text-ink-soft">{category.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button size="sm" onClick={() => save(allGranted())}>
          {CONSENT_COPY.acceptAll}
        </Button>
        <Button size="sm" onClick={() => save(defaultGrants())}>
          {CONSENT_COPY.rejectAll}
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-small">
        {purposesVisible ? (
          <Button variant="quiet" size="sm" onClick={() => save(draft)}>
            {CONSENT_COPY.save}
          </Button>
        ) : (
          <Button variant="quiet" size="sm" onClick={() => setPurposesVisible(true)}>
            {CONSENT_COPY.customize}
          </Button>
        )}
        <Link
          href={CONSENT_POLICY_PATH}
          className="rounded-inline text-ink-soft underline decoration-ink/25 underline-offset-4 hover:text-ink"
        >
          {CONSENT_COPY.policyLink}
        </Link>
      </div>
    </div>
  );
}
