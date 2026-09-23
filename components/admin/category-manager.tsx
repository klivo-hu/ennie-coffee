'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';
import type { AdminCategory } from '@/lib/admin/types';
import { categoryCreateSchema } from '@/lib/validation/admin';
import { ConfirmDialog } from './confirm-dialog';
import { Field, FormError, TextArea, TextInput } from './ui/field';
import { ImageField, type ImageValue } from './ui/image-field';
import { Modal } from './ui/modal';
import { ReorderButtons, moveItem } from './ui/reorder-buttons';
import { Switch } from './ui/switch';
import { useToast } from './ui/toast';

interface Draft {
  name: string;
  description: string;
  note: string;
  image: ImageValue | null;
  isVisible: boolean;
}

function CategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: AdminCategory | null;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: category?.name ?? '',
    description: category?.description ?? '',
    note: category?.note ?? '',
    image: category?.image
      ? { id: category.image.id, previewUrl: category.image.previewUrl }
      : null,
    isVisible: category?.isVisible ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = {
      name: draft.name,
      description: draft.description,
      note: draft.note,
      imageId: draft.image?.id ?? null,
      isVisible: draft.isVisible,
    };
    const checked = categoryCreateSchema.safeParse(body);
    if (!checked.success) {
      setErrors(
        Object.fromEntries(
          checked.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      setFormError('Ellenőrizd a megjelölt mezőket.');
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    const result = category
      ? await api(`/api/admin/categories/${category.id}`, { method: 'PATCH', body })
      : await api('/api/admin/categories', { method: 'POST', body });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.error.fields ?? {});
      setFormError(result.error.message);
      return;
    }
    onSaved(category ? 'A kategória mentve.' : 'Az új kategória elkészült.');
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
            maxLength={60}
            onChange={(event) => set('name', event.target.value)}
            autoFocus
          />
        )}
      </Field>
      <Field
        label="Bevezető"
        hint="Egy-két mondat, a kategória neve alatt jelenik meg."
        error={errors.description}
      >
        {({ id, describedBy, invalid }) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.description}
            maxLength={400}
            rows={3}
            onChange={(event) => set('description', event.target.value)}
          />
        )}
      </Field>
      <Field
        label="Megjegyzés"
        hint="Apróbetűs kiegészítés a lista alatt, pl. választható tejek."
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
      <ImageField
        label="Kategóriakép"
        value={draft.image}
        onChange={(image) => set('image', image)}
        hint="Álló (4:5 vagy 3:4) fotó mutat a legjobban. Kép nélkül a kategória tömör, kéthasábos listaként jelenik meg."
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

/** Menu categories: order on the price list, visibility, image, and texts. */
export function CategoryManager({ categories }: { categories: readonly AdminCategory[] }) {
  const router = useRouter();
  const notify = useToast();
  const [items, setItems] = useState(categories);
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setItems(categories), [categories]);

  async function run(
    request: Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    setBusy(true);
    const result = await request;
    setBusy(false);
    if (!result.ok) {
      notify(result.error?.message ?? 'Nem sikerült menteni.', 'error');
      setItems(categories);
      return false;
    }
    notify(success);
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-ink">Kategóriák</h1>
          <p className="mt-2 text-body text-ink-soft">A sorrend itt ugyanaz, mint az árlistán.</p>
        </div>
        <Button onClick={() => setEditing('new')}>Új kategória</Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-panel bg-white px-6 py-12 text-center">
          <p className="font-display text-title text-ink">Még nincs kategória.</p>
          <p className="mt-2 text-small text-ink-soft">
            Termékeket egy kategórián belül lehet felvenni.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel bg-white">
          {items.map((category, index) => (
            <li
              key={category.id}
              className="grid items-center gap-3 px-5 py-3 md:grid-cols-[auto_1fr_auto_auto]"
            >
              <div className="flex items-center gap-3">
                <ReorderButtons
                  label={category.name}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  disabled={busy}
                  onMove={(direction) => {
                    const reordered = moveItem(items, index, direction);
                    setItems(reordered);
                    void run(
                      api('/api/admin/categories/reorder', {
                        body: { ids: reordered.map((item) => item.id) },
                      }),
                      'Sorrend mentve.',
                    );
                  }}
                />
                <div className="size-12 shrink-0 overflow-hidden rounded-control bg-sage-50">
                  {category.image ? (
                    <img
                      src={category.image.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-ink">{category.name}</p>
                <p className="truncate text-small text-ink-soft">
                  {category.productCount} termék
                  {category.description ? ` · ${category.description}` : ''}
                </p>
              </div>
              <Switch
                checked={category.isVisible}
                disabled={busy}
                label={`${category.name} kategória látható`}
                onChange={(isVisible) => {
                  setItems((current) =>
                    current.map((item) =>
                      item.id === category.id ? { ...item, isVisible } : item,
                    ),
                  );
                  void run(
                    api(`/api/admin/categories/${category.id}`, {
                      method: 'PATCH',
                      body: { isVisible },
                    }),
                    isVisible ? `„${category.name}” látható.` : `„${category.name}” elrejtve.`,
                  );
                }}
              />
              <div className="flex gap-1">
                <Button variant="secondary" size="sm" onClick={() => setEditing(category)}>
                  Szerkesztés<span className="sr-only">: {category.name}</span>
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  className="px-2"
                  onClick={() => setDeleting(category)}
                >
                  Törlés<span className="sr-only">: {category.name}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Új kategória' : 'Kategória szerkesztése'}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing !== null ? (
          <CategoryForm
            category={editing === 'new' ? null : editing}
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
        title="Kategória törlése"
        confirmLabel="Törlés"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await run(
            api(`/api/admin/categories/${deleting.id}`, { method: 'DELETE' }),
            `„${deleting.name}” törölve.`,
          );
          if (ok) setDeleting(null);
        }}
        message={
          deleting && deleting.productCount > 0 ? (
            <p>
              A(z) <strong className="text-ink">„{deleting.name}”</strong> kategóriában még{' '}
              {deleting.productCount} termék van. Csak üres kategória törölhető — előbb helyezd át
              vagy töröld a termékeit.
            </p>
          ) : (
            <p>
              A(z) <strong className="text-ink">„{deleting?.name}”</strong> kategória véglegesen
              törlődik.
            </p>
          )
        }
      />
    </div>
  );
}
