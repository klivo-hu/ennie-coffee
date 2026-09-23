'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** Breathing room between the sticky bars and the chapter heading when it lands. */
const LANDING_GAP_PX = 24;

/**
 * The menu's table of contents: a floating bar pinned under the site header with CSS sticky.
 *
 * - Clicking a chapter scrolls there smoothly (instantly under reduced motion), landing just below
 *   the sticky bars, updates the address, and moves focus to the chapter for keyboard and
 *   screen-reader users.
 * - While reading, the chapter in view is marked (aria-current) and, on narrow screens, scrolled
 *   into the strip's view — sideways only, never moving the page.
 */
export function CategoryNav({ items }: { items: readonly { slug: string; name: string }[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.slug ?? null);
  const bar = useRef<HTMLElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  const jumping = useRef(false);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.slug))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;
    // A chapter counts as current while it crosses a band just below the sticky bars.
    const observer = new IntersectionObserver(
      (entries) => {
        if (jumping.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-22% 0px -70% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const list = strip.current;
    const link = active ? list?.querySelector<HTMLElement>(`[data-slug="${active}"]`) : null;
    if (!list || !link) return;
    const target = link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [active]);

  function jump(event: React.MouseEvent<HTMLAnchorElement>, slug: string) {
    const section = document.getElementById(slug);
    if (!section || !bar.current) return;
    event.preventDefault();
    const reduced = window.matchMedia(REDUCED_MOTION).matches;
    // Where the bar will be once it is stuck — not where it is now, which may still be further
    // down the page if the reader has not scrolled past the hero yet.
    const stuckTop = Number.parseFloat(window.getComputedStyle(bar.current).top) || 0;
    const offset = stuckTop + bar.current.offsetHeight + LANDING_GAP_PX;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;

    setActive(slug);
    jumping.current = true;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    window.history.replaceState(null, '', `#${slug}`);
    section.focus({ preventScroll: true });
    // Let the observer take over again once the smooth scroll has settled.
    const release = () => {
      jumping.current = false;
    };
    // A timer backs up `scrollend`, which older Safari lacks and which never fires if the page
    // was already at the target.
    window.addEventListener('scrollend', release, { once: true });
    window.setTimeout(release, 1200);
  }

  if (items.length < 2) return null;

  return (
    <nav ref={bar} aria-label="Árlista kategóriái" className="sticky top-20 z-30 sm:top-[5.25rem]">
      <div className="mx-auto w-full max-w-wide px-gutter">
        <div className="relative overflow-hidden rounded-panel bg-white shadow-soft lg:-mx-5">
          <ul
            ref={strip}
            className="flex gap-1 overflow-x-auto p-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const current = item.slug === active;
              return (
                <li key={item.slug} className="shrink-0">
                  <a
                    href={`#${item.slug}`}
                    data-slug={item.slug}
                    onClick={(event) => jump(event, item.slug)}
                    aria-current={current ? 'location' : undefined}
                    className={cn(
                      'relative inline-flex h-10 items-center whitespace-nowrap rounded-control px-3 text-control transition-colors duration-base',
                      current
                        ? 'bg-sage-50 text-ink'
                        : 'text-ink-soft hover:bg-paper hover:text-ink',
                    )}
                  >
                    {item.name}
                  </a>
                </li>
              );
            })}
          </ul>
          {/* Edge fades hint that the strip scrolls sideways on narrow screens. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent md:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent md:hidden"
          />
        </div>
      </div>
    </nav>
  );
}
