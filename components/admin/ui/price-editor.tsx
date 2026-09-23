'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextInput } from './field';

export interface PriceDraft {
  label: string;
  amount: string;
}

/** Digits only: "1 890", "1.890 Ft" and "1890" all mean 1890 forints. */
export function parseForint(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  if (digits === '') return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

const MAX_ROWS = 6;

/**
 * Prices as rows: one row for a single price, several for sizes ("2,5 dl", "3,5 dl"). Amounts
 * are whole forints — the input accepts the way people naturally type them.
 */
export function PriceEditor({
  prices,
  onChange,
  error,
}: {
  prices: PriceDraft[];
  onChange: (next: PriceDraft[]) => void;
  error?: string;
}) {
  const update = (index: number, patch: Partial<PriceDraft>) =>
    onChange(prices.map((price, i) => (i === index ? { ...price, ...patch } : price)));

  return (
    <fieldset className="grid gap-3">
      <legend className="text-small font-medium text-ink">
        Ár <span className="text-danger">*</span>
      </legend>
      <p className="-mt-1 text-caption text-ink-soft">
        Egy ár esetén a kiszerelés elhagyható. Több méretnél mindegyikhez adj meg kiszerelést (pl.
        „3,5 dl”).
      </p>
      {prices.map((price, index) => (
        <div key={index} className="grid grid-cols-[1fr_9rem_auto] items-center gap-2">
          <TextInput
            aria-label={`${index + 1}. kiszerelés`}
            placeholder="Kiszerelés (pl. 2,5 dl)"
            value={price.label}
            maxLength={32}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <div className="relative">
            <TextInput
              aria-label={`${index + 1}. ár forintban`}
              inputMode="numeric"
              placeholder="1890"
              value={price.amount}
              invalid={Boolean(error) && parseForint(price.amount) === null}
              onChange={(event) => update(index, { amount: event.target.value })}
              className="pr-9 text-right tabular"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-small text-ink-soft">
              Ft
            </span>
          </div>
          <button
            type="button"
            disabled={prices.length === 1}
            onClick={() => onChange(prices.filter((_, i) => i !== index))}
            className="inline-flex size-11 items-center justify-center rounded-control text-ink-soft hover:bg-paper hover:text-danger disabled:opacity-30"
          >
            <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">{index + 1}. ár törlése</span>
          </button>
        </div>
      ))}
      {prices.length < MAX_ROWS ? (
        <Button
          variant="quiet"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange([...prices, { label: '', amount: '' }])}
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
          Újabb kiszerelés
        </Button>
      ) : null}
      {error ? <p className="text-caption font-medium text-danger">{error}</p> : null}
    </fieldset>
  );
}
