'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';
import type { AdminCategory, AdminProduct } from '@/lib/admin/types';
import { formatForint } from '@/lib/menu/format';
import { ConfirmDialog } from './confirm-dialog';
import { ProductForm } from './product-form';
import { Select, TextInput } from './ui/field';
import { Modal } from './ui/modal';
import { ReorderButtons, moveItem } from './ui/reorder-buttons';
import { Switch } from './ui/switch';
import { useToast } from './ui/toast';

type Visibility = 'osszes' | 'lathato' | 'rejtett' | 'archivalt';

function priceSummary(product: AdminProduct): string {
  const parts = product.prices.map(
    (price) => `${price.label ? `${price.label}: ` : ''}${formatForint(price.amountHuf)}`,
  );
  return `${parts.join(' · ')}${product.qualifier === 'from' ? ' (-tól)' : ''}`;
}

/**
 * The product list, grouped by category in menu order. Every change is sent to the API and the
 * page data refreshed from the server afterwards, so what is shown is always what is stored.
 */
export function ProductManager({
  categories,
  products,
  initialVisibility,
}: {
  categories: readonly AdminCategory[];
  products: readonly AdminProduct[];
  initialVisibility: string;
}) {
  const router = useRouter();
  const notify = useToast();
  const [items, setItems] = useState(products);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibility, setVisibility] = useState<Visibility>(
    (['osszes', 'lathato', 'rejtett', 'archivalt'] as const).includes(
      initialVisibility as Visibility,
    )
      ? (initialVisibility as Visibility)
      : 'osszes',
  );
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null);
  const [confirm, setConfirm] = useState<{
    product: AdminProduct;
    action: 'archive' | 'delete';
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Server data wins after every refresh.
  useEffect(() => setItems(products), [products]);

  const needle = query.trim().toLocaleLowerCase('hu');
  const filtered = useMemo(
    () =>
      items.filter((product) => {
        if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) return false;
        if (visibility === 'archivalt' ? !product.isArchived : product.isArchived) return false;
        if (visibility === 'lathato' && !product.isVisible) return false;
        if (visibility === 'rejtett' && product.isVisible) return false;
        if (needle && !product.name.toLocaleLowerCase('hu').includes(needle)) return false;
        return true;
      }),
    [items, categoryFilter, visibility, needle],
  );

  const groups = categories
    .map((category) => ({
      category,
      products: filtered
        .filter((product) => product.categoryId === category.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((group) => group.products.length > 0);

  // Reordering is only meaningful on the complete, unfiltered list of a category.
  const canReorder = visibility === 'osszes' && needle === '';

  async function mutate(
    id: string,
    request: Promise<{ ok: boolean; error?: { message: string } }>,
    success: string,
  ) {
    setBusyId(id);
    const result = await request;
    setBusyId(null);
    if (!result.ok) {
      notify(result.error?.message ?? 'Nem sikerült menteni.', 'error');
      setItems(products);
      return false;
    }
    notify(success);
    router.refresh();
    return true;
  }

  function toggleVisibility(product: AdminProduct, isVisible: boolean) {
    setItems((current) =>
      current.map((item) => (item.id === product.id ? { ...item, isVisible } : item)),
    );
    void mutate(
      product.id,
      api(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { isVisible } }),
      isVisible ? `„${product.name}” látható az árlistán.` : `„${product.name}” elrejtve.`,
    );
  }

  function move(categoryId: string, list: AdminProduct[], index: number, direction: -1 | 1) {
    const reordered = moveItem(list, index, direction);
    const order = new Map(reordered.map((product, position) => [product.id, position]));
    setItems((current) =>
      current.map((item) =>
        order.has(item.id) ? { ...item, sortOrder: order.get(item.id) as number } : item,
      ),
    );
    // Archived products keep their slots at the end; the server needs every id in the category.
    const archived = items
      .filter((item) => item.categoryId === categoryId && item.isArchived)
      .map((item) => item.id);
    void mutate(
      list[index]!.id,
      api('/api/admin/products/reorder', {
        body: { categoryId, ids: [...reordered.map((product) => product.id), ...archived] },
      }),
      'Sorrend mentve.',
    );
  }

  async function runConfirm() {
    if (!confirm) return;
    const { product, action } = confirm;
    const ok =
      action === 'archive'
        ? await mutate(
            product.id,
            api(`/api/admin/products/${product.id}`, {
              method: 'PATCH',
              body: { isArchived: true },
            }),
            `„${product.name}” archiválva.`,
          )
        : await mutate(
            product.id,
            api(`/api/admin/products/${product.id}`, { method: 'DELETE' }),
            `„${product.name}” véglegesen törölve.`,
          );
    if (ok) setConfirm(null);
  }

  const defaultCategory = categoryFilter !== 'all' ? categoryFilter : (categories[0]?.id ?? '');

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-ink">Termékek</h1>
          <p className="mt-2 text-body text-ink-soft">
            Név, leírás, ár, kategória, kép, sorrend és láthatóság.
          </p>
        </div>
        <Button onClick={() => setEditing('new')} disabled={categories.length === 0}>
          Új termék
        </Button>
      </div>

      <div className="grid gap-3 rounded-panel bg-white p-4 sm:grid-cols-[1fr_14rem_12rem]">
        <label className="grid gap-1 text-caption text-ink-soft">
          Keresés
          <TextInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Terméknév"
          />
        </label>
        <label className="grid gap-1 text-caption text-ink-soft">
          Kategória
          <Select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Minden kategória</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-caption text-ink-soft">
          Állapot
          <Select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as Visibility)}
          >
            <option value="osszes">Összes aktív</option>
            <option value="lathato">Csak látható</option>
            <option value="rejtett">Csak rejtett</option>
            <option value="archivalt">Archivált</option>
          </Select>
        </label>
      </div>

      {!canReorder ? (
        <p className="-mt-4 text-caption text-ink-soft">
          A sorrend módosításához állítsd az állapotot „Összes aktív”-ra, és töröld a keresést.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className="rounded-panel bg-white px-6 py-12 text-center">
          <p className="font-display text-title text-ink">Nincs a szűrésnek megfelelő termék.</p>
          <p className="mt-2 text-small text-ink-soft">
            Módosítsd a szűrőket, vagy vegyél fel új terméket.
          </p>
        </div>
      ) : null}

      {groups.map(({ category, products: list }) => (
        <section
          key={category.id}
          aria-labelledby={`group-${category.id}`}
          className="overflow-hidden rounded-panel bg-white"
        >
          <header className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={`group-${category.id}`} className="font-display text-title text-ink">
              {category.name}
              {!category.isVisible ? (
                <span className="ml-2 text-small font-sans text-ink-soft">(rejtett kategória)</span>
              ) : null}
            </h2>
            <span className="text-small text-ink-soft tabular">{list.length} tétel</span>
          </header>
          <ul className="divide-y divide-line">
            {list.map((product, index) => (
              <li
                key={product.id}
                className="grid items-center gap-3 px-5 py-3 md:grid-cols-[auto_1fr_auto_auto]"
              >
                <div className="flex items-center gap-3">
                  {canReorder && !product.isArchived ? (
                    <ReorderButtons
                      label={product.name}
                      isFirst={index === 0}
                      isLast={index === list.length - 1}
                      disabled={busyId !== null}
                      onMove={(direction) => move(category.id, list, index, direction)}
                    />
                  ) : null}
                  <div className="size-11 shrink-0 overflow-hidden rounded-full bg-sage-50">
                    {product.image ? (
                      <img
                        src={product.image.previewUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{product.name}</p>
                  <p className="truncate text-small text-ink-soft tabular">
                    {priceSummary(product)}
                  </p>
                </div>
                {product.isArchived ? (
                  <span className="text-small text-ink-soft">Archivált</span>
                ) : (
                  <Switch
                    checked={product.isVisible}
                    disabled={busyId === product.id}
                    onChange={(value) => toggleVisibility(product, value)}
                    label={`${product.name} látható az árlistán`}
                  />
                )}
                <div className="flex flex-wrap gap-1">
                  {product.isArchived ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === product.id}
                        onClick={() =>
                          void mutate(
                            product.id,
                            api(`/api/admin/products/${product.id}`, {
                              method: 'PATCH',
                              body: { isArchived: false },
                            }),
                            `„${product.name}” visszaállítva.`,
                          )
                        }
                      >
                        Visszaállítás
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => setConfirm({ product, action: 'delete' })}
                      >
                        Végleges törlés
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
                        Szerkesztés<span className="sr-only">: {product.name}</span>
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        className="px-2"
                        onClick={() => setConfirm({ product, action: 'archive' })}
                      >
                        Archiválás<span className="sr-only">: {product.name}</span>
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Új termék' : 'Termék szerkesztése'}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing !== null ? (
          <ProductForm
            product={editing === 'new' ? null : editing}
            categories={categories}
            defaultCategoryId={defaultCategory}
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
        open={confirm !== null}
        title={confirm?.action === 'delete' ? 'Végleges törlés' : 'Archiválás'}
        confirmLabel={confirm?.action === 'delete' ? 'Végleges törlés' : 'Archiválás'}
        busy={busyId !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
        message={
          confirm?.action === 'delete' ? (
            <p>
              A(z) <strong className="text-ink">„{confirm.product.name}”</strong> véglegesen
              törlődik az árakkal és a képpel együtt. Ez nem vonható vissza.
            </p>
          ) : (
            <p>
              A(z) <strong className="text-ink">„{confirm?.product.name}”</strong> lekerül az
              árlistáról és a listából. Az „Archivált” szűrővel később visszaállíthatod.
            </p>
          )
        }
      />
    </div>
  );
}
