'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SocialIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';
import type { AdminSocialLink } from '@/lib/admin/types';
import {
  PLATFORM_LABEL,
  SOCIAL_PLATFORMS,
  isOrderingPlatform,
  isSocialPlatform,
  type SocialPlatformId,
} from '@/lib/social/platforms';
import { socialCreateSchema } from '@/lib/validation/admin';
import { ConfirmDialog } from './confirm-dialog';
import { Field, FormError, Select, TextInput } from './ui/field';
import { Modal } from './ui/modal';
import { ReorderButtons, moveItem } from './ui/reorder-buttons';
import { Switch } from './ui/switch';
import { useToast } from './ui/toast';

function SocialForm({
  link,
  onSaved,
  onCancel,
}: {
  link: AdminSocialLink | null;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [platform, setPlatform] = useState<SocialPlatformId>(
    link && isSocialPlatform(link.platform) ? link.platform : 'instagram',
  );
  const [url, setUrl] = useState(link?.url ?? 'https://');
  const [handle, setHandle] = useState(link?.handle ?? '');
  const [isVisible, setVisible] = useState(link?.isVisible ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = { platform, url: url.trim(), handle, isVisible };
    const checked = socialCreateSchema.safeParse(body);
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
    const result = link
      ? await api(`/api/admin/social/${link.id}`, { method: 'PATCH', body })
      : await api('/api/admin/social', { method: 'POST', body });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.error.fields ?? {});
      setFormError(result.error.message);
      return;
    }
    onSaved(link ? 'A link mentve.' : 'Az új link elkészült.');
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <FormError message={formError} />
      <Field label="Platform" required error={errors.platform}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={platform}
            onChange={(event) => setPlatform(event.target.value as SocialPlatformId)}
          >
            {SOCIAL_PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {PLATFORM_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Webcím" required hint="A teljes cím, https:// kezdettel." error={errors.url}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="url"
            inputMode="url"
            value={url}
            maxLength={300}
            onChange={(event) => setUrl(event.target.value)}
          />
        )}
      </Field>
      <Field label="Megjelenő név" hint="Nem kötelező, pl. @enniecoffee" error={errors.handle}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={handle}
            maxLength={60}
            onChange={(event) => setHandle(event.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <Switch checked={isVisible} onChange={setVisible} label="Látható a weboldalon" />
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

const GROUPS = [
  {
    key: 'social',
    title: 'Közösségi oldalak',
    description:
      'A „Kövess minket” szekciókban és a lábléc ikonjai között jelennek meg, ebben a sorrendben.',
    empty: 'Nincs közösségi link — a „Kövess minket” szekció addig nem jelenik meg.',
    matches: (link: AdminSocialLink) => !isOrderingPlatform(link.platform),
  },
  {
    key: 'ordering',
    title: 'Online rendelés',
    description:
      'Az első látható link a fejléc „Rendelés” gombja és az árlista rendelési ajánlata lesz.',
    empty: 'Nincs rendelési link (pl. foodora) — a rendelés gomb addig rejtve marad.',
    matches: (link: AdminSocialLink) => isOrderingPlatform(link.platform),
  },
] as const;

/**
 * External links in two groups: social profiles, and online-ordering platforms (foodora), which
 * the site uses as a call to action rather than as social media.
 */
export function SocialManager({ links }: { links: readonly AdminSocialLink[] }) {
  const router = useRouter();
  const notify = useToast();
  const [items, setItems] = useState(links);
  const [editing, setEditing] = useState<AdminSocialLink | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminSocialLink | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setItems(links), [links]);

  async function run(
    request: Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    setBusy(true);
    const result = await request;
    setBusy(false);
    if (!result.ok) {
      notify(result.error?.message ?? 'Nem sikerült menteni.', 'error');
      setItems(links);
      return false;
    }
    notify(success);
    router.refresh();
    return true;
  }

  function move(groupItems: AdminSocialLink[], index: number, direction: -1 | 1) {
    const reorderedGroup = moveItem(groupItems, index, direction);
    const groupIds = new Set(groupItems.map((item) => item.id));
    // The order is global; the other group keeps its relative order around this one.
    const reordered = [...reorderedGroup, ...items.filter((item) => !groupIds.has(item.id))];
    setItems(reordered);
    void run(
      api('/api/admin/social/reorder', { body: { ids: reordered.map((item) => item.id) } }),
      'Sorrend mentve.',
    );
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-ink">Linkek</h1>
          <p className="mt-2 text-body text-ink-soft">Közösségi oldalak és online rendelés.</p>
        </div>
        <Button onClick={() => setEditing('new')}>Új link</Button>
      </div>

      {GROUPS.map((group) => {
        const groupItems = items.filter(group.matches);
        return (
          <section key={group.key} aria-labelledby={`links-${group.key}`} className="grid gap-3">
            <div>
              <h2 id={`links-${group.key}`} className="font-display text-title text-ink">
                {group.title}
              </h2>
              <p className="mt-1 text-small text-ink-soft">{group.description}</p>
            </div>
            {groupItems.length === 0 ? (
              <p className="rounded-panel bg-white px-6 py-8 text-center text-small text-ink-soft">
                {group.empty}
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-panel bg-white">
                {groupItems.map((link, index) => {
                  const label = isSocialPlatform(link.platform)
                    ? PLATFORM_LABEL[link.platform]
                    : link.platform;
                  return (
                    <li
                      key={link.id}
                      className="grid items-center gap-3 px-5 py-3 md:grid-cols-[auto_1fr_auto_auto]"
                    >
                      <div className="flex items-center gap-3">
                        <ReorderButtons
                          label={label}
                          isFirst={index === 0}
                          isLast={index === groupItems.length - 1}
                          disabled={busy}
                          onMove={(direction) => move(groupItems, index, direction)}
                        />
                        <span className="inline-flex size-10 items-center justify-center rounded-full bg-sage-50 text-sage-800">
                          <SocialIcon platform={link.platform} className="size-5" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {label}
                          {link.handle ? (
                            <span className="font-normal text-ink-soft"> · {link.handle}</span>
                          ) : null}
                        </p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-small text-sage-800 underline decoration-sage-800/30 underline-offset-4"
                        >
                          {link.url}
                        </a>
                      </div>
                      <Switch
                        checked={link.isVisible}
                        disabled={busy}
                        label={`${label} link látható`}
                        onChange={(isVisible) => {
                          setItems((current) =>
                            current.map((item) =>
                              item.id === link.id ? { ...item, isVisible } : item,
                            ),
                          );
                          void run(
                            api(`/api/admin/social/${link.id}`, {
                              method: 'PATCH',
                              body: { isVisible },
                            }),
                            isVisible ? `${label} látható.` : `${label} elrejtve.`,
                          );
                        }}
                      />
                      <div className="flex gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(link)}>
                          Szerkesztés<span className="sr-only">: {label}</span>
                        </Button>
                        <Button
                          variant="quiet"
                          size="sm"
                          className="px-2"
                          onClick={() => setDeleting(link)}
                        >
                          Törlés<span className="sr-only">: {label}</span>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Új link' : 'Link szerkesztése'}
        onClose={() => setEditing(null)}
      >
        {editing !== null ? (
          <SocialForm
            link={editing === 'new' ? null : editing}
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
        title="Link törlése"
        confirmLabel="Törlés"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await run(
            api(`/api/admin/social/${deleting.id}`, { method: 'DELETE' }),
            'A link törölve.',
          );
          if (ok) setDeleting(null);
        }}
        message={
          <p>
            A link véglegesen törlődik. Ha csak ideiglenesen vennéd le, használd inkább a láthatóság
            kapcsolót.
          </p>
        }
      />
    </div>
  );
}
