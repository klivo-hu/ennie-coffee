'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AdminCategory, AdminProduct } from '@/lib/admin/types';
import { api } from '@/lib/admin/client-api';
import { productCreateSchema } from '@/lib/validation/admin';
import { Field, FormError, Select, TextArea, TextInput } from './ui/field';
import { ImageField, type ImageValue } from './ui/image-field';
import { PriceEditor, parseForint, type PriceDraft } from './ui/price-editor';
import { Switch } from './ui/switch';

interface Draft {
  categoryId: string;
  name: string;
  description: string;
  qualifier: 'exact' | 'from';
  prices: PriceDraft[];
  image: ImageValue | null;
  isVisible: boolean;
}

function toDraft(product: AdminProduct | null, categoryId: string): Draft {
  if (!product) {
    return {
      categoryId,
      name: '',
      description: '',
      qualifier: 'exact',
      prices: [{ label: '', amount: '' }],
      image: null,
      isVisible: true,
    };
  }
  return {
    categoryId: product.categoryId,
    name: product.name,
    description: product.description ?? '',
    qualifier: product.qualifier,
    prices: product.prices.map((price) => ({
      label: price.label ?? '',
      amount: String(price.amountHuf),
    })),
    image: product.image ? { id: product.image.id, previewUrl: product.image.previewUrl } : null,
    isVisible: product.isVisible,
  };
}

/**
 * Create / edit one product. The same schema the server enforces runs here first, so mistakes are
 * pointed out beside the field before anything is sent; the server's answer is still the one
 * that counts, and its field errors are shown the same way.
 */
export function ProductForm({
  product,
  categories,
  defaultCategoryId,
  onSaved,
  onCancel,
}: {
  product: AdminProduct | null;
  categories: readonly AdminCategory[];
  defaultCategoryId: string;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(product, defaultCategoryId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const body = {
      categoryId: draft.categoryId,
      name: draft.name,
      description: draft.description,
      qualifier: draft.qualifier,
      prices: draft.prices.map((price) => ({
        label: price.label.trim() === '' ? null : price.label,
        amountHuf: parseForint(price.amount) ?? Number.NaN,
      })),
      imageId: draft.image?.id ?? null,
      isVisible: draft.isVisible,
    };
    const checked = productCreateSchema.safeParse(body);
    if (!checked.success) {
      const fields: Record<string, string> = {};
      for (const issue of checked.error.issues) {
        const key = issue.path[0] === 'prices' ? 'prices' : String(issue.path[0] ?? '_');
        fields[key] ??= issue.message;
      }
      setErrors(fields);
      setFormError('Ellenőrizd a megjelölt mezőket.');
      return;
    }
    setErrors({});
    setBusy(true);
    const result = product
      ? await api(`/api/admin/products/${product.id}`, { method: 'PATCH', body })
      : await api('/api/admin/products', { method: 'POST', body });
    setBusy(false);
    if (!result.ok) {
      const fields = Object.fromEntries(
        Object.entries(result.error.fields ?? {}).map(([key, message]) => [
          key.split('.')[0] ?? key,
          message,
        ]),
      );
      setErrors(fields);
      setFormError(result.error.message);
      return;
    }
    onSaved(product ? 'A termék mentve.' : 'Az új termék elkészült.');
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <FormError message={formError} />
      <div className="grid gap-5 sm:grid-cols-2">
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
        <Field label="Kategória" required error={errors.categoryId}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.categoryId}
              onChange={(event) => set('categoryId', event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field
        label="Leírás"
        hint="Összetevők, kiszerelés — egy-két mondat."
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
              name="qualifier"
              className="size-4 accent-sage-800"
              checked={draft.qualifier === 'exact'}
              onChange={() => set('qualifier', 'exact')}
            />
            Pontos ár (pl. 1 890 Ft)
          </label>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="qualifier"
              className="size-4 accent-sage-800"
              checked={draft.qualifier === 'from'}
              onChange={() => set('qualifier', 'from')}
            />
            Kezdőár (pl. 1 890 Ft-tól)
          </label>
        </div>
      </fieldset>

      <ImageField
        label="Kép (nem kötelező)"
        value={draft.image}
        onChange={(image) => set('image', image)}
        hint="JPEG, PNG, WebP vagy HEIC, legfeljebb 12 MB. A weboldal kör alakú kivágásban mutatja az árlistán."
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <Switch
          checked={draft.isVisible}
          onChange={(value) => set('isVisible', value)}
          label="Látható az árlistán"
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
