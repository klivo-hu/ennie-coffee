import { MenuPicture } from '@/components/media/menu-picture';
import { cn } from '@/lib/cn';
import { formatForint, formatPrice, spokenPrice } from '@/lib/menu/format';
import type { MenuProduct } from '@/lib/menu/types';

/**
 * One line of the menu, set like a printed café menu: the name in the display face, a dotted
 * leader carrying the eye to the price, and the description beneath in the reading face. A
 * product with several sizes lists them as a quiet row instead of a single price.
 */
export function MenuItem({
  product,
  compact = false,
}: {
  product: MenuProduct;
  compact?: boolean;
}) {
  const single = product.prices.length === 1 ? product.prices[0] : undefined;
  const sized = product.prices.length > 1;

  return (
    <li className={cn('border-b border-line', compact ? 'py-4' : 'py-5 sm:py-6')}>
      <article className="flex gap-4" aria-labelledby={`item-${product.id}`}>
        {product.image ? (
          <div className="relative mt-1 size-14 shrink-0 overflow-hidden rounded-full bg-sage-100 sm:size-16">
            <MenuPicture image={product.image} alt="" sizes="(min-width: 640px) 64px, 56px" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3
              id={`item-${product.id}`}
              className={cn(
                'font-display text-ink',
                compact ? 'text-body sm:text-title' : 'text-title',
              )}
            >
              {product.name}
            </h3>
            {single ? (
              <>
                <span
                  aria-hidden="true"
                  className="min-w-6 flex-1 -translate-y-[0.3em] border-b border-dotted border-ink/25"
                />
                <p className="tabular shrink-0 whitespace-nowrap text-body font-medium text-ink">
                  <span aria-hidden="true">{formatPrice(single, product.qualifier)}</span>
                  <span className="sr-only">{spokenPrice(single, product.qualifier)}</span>
                </p>
              </>
            ) : null}
          </div>
          {product.description ? (
            <p className="mt-1.5 max-w-[56ch] text-small text-ink-soft">{product.description}</p>
          ) : null}
          {sized ? (
            <ul
              className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-small"
              aria-label="Kiszerelések és árak"
            >
              {product.prices.map((price) => (
                <li key={`${price.label}-${price.amountHuf}`} className="flex items-baseline gap-2">
                  <span className="text-ink-soft">{price.label}</span>
                  <span className="tabular font-medium text-ink">
                    {formatForint(price.amountHuf)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>
    </li>
  );
}
