'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';
import type { AdminSeasonalItem, AdminSeasonalSection } from '@/lib/admin/types';
import { formatForint, formatPrice } from '@/lib/menu/format';
import {
  MAX_SEASONAL_ITEMS,
  SEASONAL_STYLES,
  SEASONAL_STYLE_HINT,
  SEASONAL_STYLE_LABEL,
  type SeasonalStyle,
} from '@/lib/seasonal/styles';
import { ConfirmDialog } from './confirm-dialog';
import { SeasonalItemForm } from './seasonal-item-form';
import { Field, FormError, Select, TextArea, TextInput } from './ui/field';
import { Modal } from './ui/modal';
import { ReorderButtons, moveItem } from './ui/reorder-buttons';
import { Switch } from './ui/switch';
import { useToast } from './ui/toast';

interface SettingsDraft {
  isEnabled: boolean;
  title: string;
  lead: string;
  note: string;
  homeStyle: SeasonalStyle;
  listStyle: SeasonalStyle;
}

function toSettings(section: AdminSeasonalSection): SettingsDraft {
  return {
    isEnabled: section.isEnabled,
    title: section.title,
    lead: section.lead ?? '',
    note: section.note ?? '',
    homeStyle: section.homeStyle,
    listStyle: section.listStyle,
  };
}

/** The item's price as one line, the way the price list will show it. */
function priceSummary(item: AdminSeasonalItem): string {
  const [first] = item.prices;
  if (!first) return '—';
  if (item.prices.length === 1) return formatPrice(first, item.qualifier);
  return item.prices
    .map((price) => `${price.label ?? ''} ${formatForint(price.amountHuf)}`.trim())
    .join(' · ');
}

/**
 * The seasonal showcase: whether it runs, what it is called, how it is laid out on each page,
 * and the drinks in it.
 *
 * The section's own settings are saved as one form — the switch decides whether the whole thing
 * is on the site, so it is saved together with the title and the layouts it applies to, rather
 * than taking effect under the owner's hands while they are still writing. The items below save
 * one by one, like products do.
 */
export function SeasonalManager({ section }: { section: AdminSeasonalSection }) {
  const router = useRouter();
  const notify = useToast();
  const [items, setItems] = useState(section.items);
  const [editing, setEditing] = useState<AdminSeasonalItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminSeasonalItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setItems(section.items), [section.items]);

  const visibleCount = items.filter((item) => item.isVisible).length;
  const full = items.length >= MAX_SEASONAL_ITEMS;

  async function run(
    request: Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    setBusy(true);
    const result = await request;
    setBusy(false);
    if (!result.ok) {
      notify(result.error?.message ?? 'Nem sikerült menteni.', 'error');
      setItems(section.items);
      return false;
    }
    notify(success);
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-display-md text-ink">Szezonális újdonságok</h1>
        <p className="mt-2 max-w-2xl text-body text-ink-soft">
          Egy kiemelt szakasz a főoldalon és az árlista élén: néhány aktuális ital nagy fotóval,
          leírással, összetevőkkel és árral. Bekapcsolva mindkét oldalon megjelenik.
        </p>
      </div>

      <SectionSettings section={section} />

      {section.isEnabled && visibleCount === 0 ? (
        <p className="rounded-panel bg-warning-soft px-5 py-4 text-small text-ink">
          A szakasz be van kapcsolva, de nincs benne látható tétel, ezért egyelőre nem jelenik meg a
          weboldalon.
        </p>
      ) : null}

      <section aria-labelledby="seasonal-items-title" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="seasonal-items-title" className="font-display text-title text-ink">
              Tételek
            </h2>
            <p className="mt-1 text-small text-ink-soft">
              A sorrend itt ugyanaz, mint a weboldalon; a fotók felváltva kerülnek bal és jobb
              oldalra.
            </p>
          </div>
          <Button onClick={() => setEditing('new')} disabled={full}>
            Új tétel
          </Button>
        </div>

        {full ? (
          <p className="text-small text-ink-soft">
            Elérted a {MAX_SEASONAL_ITEMS} tételes határt. Törölj egyet, mielőtt újat veszel fel.
          </p>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-panel bg-white px-6 py-12 text-center">
            <p className="font-display text-title text-ink">Még nincs szezonális tétel.</p>
            <p className="mt-2 text-small text-ink-soft">
              Vegyél fel egyet — fotóval, leírással és árral.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-panel bg-white">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="grid items-center gap-3 px-5 py-3 md:grid-cols-[auto_1fr_auto_auto]"
              >
                <div className="flex items-center gap-3">
                  <ReorderButtons
                    label={item.name}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    disabled={busy}
                    onMove={(direction) => {
                      const reordered = moveItem(items, index, direction);
                      setItems(reordered);
                      void run(
                        api('/api/admin/seasonal/items/reorder', {
                          body: { ids: reordered.map((entry) => entry.id) },
                        }),
                        'Sorrend mentve.',
                      );
                    }}
                  />
                  <div className="size-12 shrink-0 overflow-hidden rounded-control bg-sage-50">
                    {item.image ? (
                      // Admin preview of an already-processed variant; no optimization pass needed.
                      <img src={item.image.previewUrl} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="truncate text-small text-ink-soft">
                    {priceSummary(item)}
                    {item.ingredients.length > 0 ? ` · ${item.ingredients.join(', ')}` : ''}
                  </p>
                </div>
                <Switch
                  checked={item.isVisible}
                  disabled={busy}
                  label={`${item.name} látható`}
                  onChange={(isVisible) => {
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id ? { ...entry, isVisible } : entry,
                      ),
                    );
                    void run(
                      api(`/api/admin/seasonal/items/${item.id}`, {
                        method: 'PATCH',
                        body: { isVisible },
                      }),
                      isVisible ? `„${item.name}” látható.` : `„${item.name}” elrejtve.`,
                    );
                  }}
                />
                <div className="flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>
                    Szerkesztés<span className="sr-only">: {item.name}</span>
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    className="px-2"
                    onClick={() => setDeleting(item)}
                  >
                    Törlés<span className="sr-only">: {item.name}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Új szezonális tétel' : 'Tétel szerkesztése'}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing !== null ? (
          <SeasonalItemForm
            item={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={(message) => {
              setEditing(null);
              notify(message);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Tétel törlése"
        confirmLabel="Törlés"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const done = await run(
            api(`/api/admin/seasonal/items/${deleting.id}`, { method: 'DELETE' }),
            `„${deleting.name}” törölve.`,
          );
          if (done) setDeleting(null);
        }}
        message={
          <p>
            A(z) <strong className="text-ink">„{deleting?.name}”</strong> tétel véglegesen törlődik
            a szezonális szakaszból. Ha csak egy időre vennéd le, kapcsold inkább rejtettre.
          </p>
        }
      />
    </div>
  );
}

/** The section's own settings: one form, one save. */
function SectionSettings({ section }: { section: AdminSeasonalSection }) {
  const router = useRouter();
  const notify = useToast();
  const [draft, setDraft] = useState<SettingsDraft>(() => toSettings(section));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(toSettings(section)), [section]);

  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty = (Object.keys(draft) as (keyof SettingsDraft)[]).some(
    (key) => draft[key] !== toSettings(section)[key],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setBusy(true);
    const result = await api('/api/admin/seasonal', {
      method: 'PATCH',
      body: {
        isEnabled: draft.isEnabled,
        title: draft.title,
        lead: draft.lead,
        note: draft.note,
        homeStyle: draft.homeStyle,
        listStyle: draft.listStyle,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.error.fields ?? {});
      setFormError(result.error.message);
      return;
    }
    setErrors({});
    notify('A szakasz beállításai mentve.');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-6 rounded-panel bg-white p-6 sm:p-8" noValidate>
      <FormError message={formError} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-medium text-ink">Szakasz megjelenítése</p>
          <p className="mt-1 text-small text-ink-soft">
            Bekapcsolva a főoldalon és az árlista első szakaszaként is megjelenik.
          </p>
        </div>
        <Switch
          checked={draft.isEnabled}
          onChange={(value) => set('isEnabled', value)}
          label="A szezonális szakasz megjelenik a weboldalon"
          showState={false}
        />
      </div>

      <Field
        label="Szakasz címe"
        required
        hint="Ez a cím jelenik meg a weboldalon és az árlista kategóriasávjában."
        error={errors.title}
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.title}
            maxLength={60}
            onChange={(event) => set('title', event.target.value)}
          />
        )}
      </Field>

      <Field label="Bevezető" hint="Egy-két mondat a cím alatt. Elhagyható." error={errors.lead}>
        {({ id, describedBy, invalid }) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.lead}
            maxLength={400}
            rows={2}
            onChange={(event) => set('lead', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Megjegyzés"
        hint="Apróbetűs kiegészítés a szakasz alatt, pl. meddig kaphatók."
        error={errors.note}
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.note}
            maxLength={300}
            onChange={(event) => set('note', event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Elrendezés a főoldalon"
          hint={SEASONAL_STYLE_HINT[draft.homeStyle]}
          error={errors.homeStyle}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.homeStyle}
              onChange={(event) => set('homeStyle', event.target.value as SeasonalStyle)}
            >
              {SEASONAL_STYLES.map((style) => (
                <option key={style} value={style}>
                  {SEASONAL_STYLE_LABEL[style]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Elrendezés az árlistán"
          hint={SEASONAL_STYLE_HINT[draft.listStyle]}
          error={errors.listStyle}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.listStyle}
              onChange={(event) => set('listStyle', event.target.value as SeasonalStyle)}
            >
              {SEASONAL_STYLES.map((style) => (
                <option key={style} value={style}>
                  {SEASONAL_STYLE_LABEL[style]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-line pt-6">
        <p aria-live="polite" className="mr-auto text-small text-ink-soft">
          {dirty ? 'Nem mentett módosítások.' : 'Minden mentve.'}
        </p>
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? 'Mentés…' : 'Beállítások mentése'}
        </Button>
      </div>
    </form>
  );
}
