'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';
import type { AdminSeasonalItem } from '@/lib/admin/types';
import { MAX_SEASONAL_INGREDIENTS } from '@/lib/seasonal/styles';
import { seasonalItemCreateSchema } from '@/lib/validation/admin';
import { Field, FormError, TextArea, TextInput } from './ui/field';
import { ImageField, type ImageValue } from './ui/image-field';
import { PriceEditor, parseForint, type PriceDraft } from './ui/price-editor';
import { Switch } from './ui/switch';

interface Draft {
  name: string;
  description: string;
  ingredients: string;
  qualifier: 'exact' | 'from';
  prices: PriceDraft[];
  image: ImageValue | null;
  isVisible: boolean;
}

/** "eszpresszó, zabtej , " → ["eszpresszó", "zabtej"]. Blank entries are simply dropped. */
export function parseIngredients(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function toDraft(item: AdminSeasonalItem | null): Draft {
  if (!item) {
    return {
      name: '',
      description: '',
      ingredients: '',
      qualifier: 'exact',
      prices: [{ label: '', amount: '' }],
      image: null,
      isVisible: true,
    };
  }
  return {
    name: item.name,
    description: item.description ?? '',
    ingredients: item.ingredients.join(', '),
    qualifier: item.qualifier,
    prices: item.prices.map((price) => ({
      label: price.label ?? '',
      amount: String(price.amountHuf),
    })),
    image: item.image ? { id: item.image.id, previewUrl: item.image.previewUrl } : null,
    isVisible: item.isVisible,
  };
}

/**
 * Create / edit one item of the seasonal showcase. The same schema the server enforces runs here
 * first, so mistakes are pointed out beside the field before anything is sent; the server's
 * answer is still the one that counts, and its field errors are shown the same way.
 */
export function SeasonalItemForm({
  item,
  onSaved,
  onCancel,
}: {
  item: AdminSeasonalItem | null;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const body = {
      name: draft.name,
      description: draft.description,
      ingredients: parseIngredients(draft.ingredients),
      qualifier: draft.qualifier,
      prices: draft.prices.map((price) => ({
        label: price.label.trim() === '' ? null : price.label,
        amountHuf: parseForint(price.amount) ?? Number.NaN,
      })),
      imageId: draft.image?.id ?? null,
      isVisible: draft.isVisible,
    };
    const checked = seasonalItemCreateSchema.safeParse(body);
    if (!checked.success) {
      const fields: Record<string, string> = {};
      for (const issue of checked.error.issues) {
        const key = String(issue.path[0] ?? '_');
        fields[key] ??= issue.message;
      }
      setErrors(fields);
      setFormError('Ellenőrizd a megjelölt mezőket.');
      return;
    }
    setErrors({});
    setBusy(true);
    const result = item
      ? await api(`/api/admin/seasonal/items/${item.id}`, { method: 'PATCH', body })
      : await api('/api/admin/seasonal/items', { method: 'POST', body });
    setBusy(false);
    if (!result.ok) {
      setErrors(
        Object.fromEntries(
          Object.entries(result.error.fields ?? {}).map(([key, message]) => [
            key.split('.')[0] ?? key,
            message,
          ]),
        ),
      );
      setFormError(result.error.message);
      return;
    }
    onSaved(item ? 'A tétel mentve.' : 'Az új tétel elkészült.');
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <FormError message={formError} />

      <Field label="Név" required error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.name}
            maxLength={80}
            onChange={(event) => set('name', event.target.value)}
            autoFocus
          />
        )}
      </Field>

      <Field
        label="Leírás"
        hint="Egy-két mondat: milyen az íze, miért érdemes most megkóstolni."
        error={errors.description}
      >
        {({ id, describedBy, invalid }) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.description}
            maxLength={600}
            rows={3}
            onChange={(event) => set('description', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Összetevők"
        hint={`Vesszővel elválasztva, pl. „eszpresszó, zabtej, juharszirup”. Legfeljebb ${MAX_SEASONAL_INGREDIENTS} elem; a weboldalon külön címkeként jelennek meg.`}
        error={errors.ingredients}
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.ingredients}
            maxLength={600}
            onChange={(event) => set('ingredients', event.target.value)}
          />
        )}
      </Field>

      <PriceEditor
        prices={draft.prices}
        onChange={(prices) => set('prices', prices)}
        error={errors.prices}
      />

      <fieldset className="grid gap-2">
        <legend className="text-small font-medium text-ink">Az ár megjelenítése</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-small">
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="seasonal-qualifier"
              className="size-4 accent-sage-800"
              checked={draft.qualifier === 'exact'}
              onChange={() => set('qualifier', 'exact')}
            />
            Pontos ár (pl. 1 890 Ft)
          </label>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="seasonal-qualifier"
              className="size-4 accent-sage-800"
              checked={draft.qualifier === 'from'}
              onChange={() => set('qualifier', 'from')}
            />
            Kezdőár (pl. 1 890 Ft-tól)
          </label>
        </div>
      </fieldset>

      <ImageField
        label="Fotó"
        value={draft.image}
        onChange={(image) => set('image', image)}
        hint="A szakasz nagy méretben mutatja, ezért ez a legfontosabb kép. JPEG, PNG, WebP vagy HEIC, legfeljebb 12 MB."
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <Switch
          checked={draft.isVisible}
          onChange={(value) => set('isVisible', value)}
          label="Látható a weboldalon"
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Mégse
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Mentés…' : 'Mentés'}
          </Button>
        </div>
      </div>
    </form>
  );
}
