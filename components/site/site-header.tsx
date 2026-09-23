'use client';

import { Link } from '@/components/ui/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { CloseIcon, MenuIcon, PhoneIcon, SocialIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { MOTION_QUERY, gsap, useGSAP } from '@/lib/motion/gsap';
import { PRIMARY_NAV, isActivePath } from '@/lib/navigation';
import { PLATFORM_LABEL, isSocialPlatform } from '@/lib/social/platforms';
import { Wordmark } from './wordmark';

export interface HeaderProps {
  readonly phone: string | null;
  readonly phoneHref: string | null;
  readonly address: string;
  readonly hours: readonly { readonly days: string; readonly time: string }[];
  readonly social: readonly {
    readonly id: string;
    readonly platform: string;
    readonly url: string;
  }[];
}

/**
 * Site header. A client component because it owns three pieces of interaction: the deeper shadow
 * once the page scrolls, the active-page state, and the mobile menu.
 */
export function SiteHeader({ phone, phoneHref, address, hours, social }: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // An observer on a 1px sentinel, instead of a scroll listener, keeps the main thread quiet.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="absolute inset-x-0 top-0 h-px" />
      <header className="sticky top-3 z-40 mt-3 sm:top-4 sm:mt-4">
        {/*
          A floating white bar on the page grid. From lg up it reaches 1.25rem past the content
          column on each side with the same inner padding, so the wordmark sits exactly on the
          column edge that every section's text starts from.
        */}
        <div className="mx-auto w-full max-w-wide px-gutter">
          <div
            className={cn(
              'flex h-[3.75rem] items-center justify-between gap-6 rounded-panel bg-white pl-4 pr-2.5 transition-shadow duration-slow sm:pl-5 lg:-mx-5',
              scrolled ? 'shadow-lift' : 'shadow-soft',
            )}
          >
            <Wordmark />

            <nav aria-label="Fő navigáció" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {PRIMARY_NAV.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative inline-flex h-10 items-center rounded-control px-3 text-control font-medium tracking-label transition-colors duration-base',
                          'after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:bg-sage-700 after:transition-transform after:duration-slow after:ease-out',
                          active
                            ? 'text-ink after:scale-x-100'
                            : 'text-ink-soft after:scale-x-0 hover:text-ink hover:after:scale-x-100',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              {phoneHref ? (
                <ButtonLink
                  href={phoneHref}
                  variant="secondary"
                  size="sm"
                  className="hidden lg:inline-flex"
                >
                  <PhoneIcon className="size-4" />
                  Asztalfoglalás
                </ButtonLink>
              ) : null}
              <MobileMenuButton open={open} onToggle={() => setOpen((value) => !value)} />
            </div>
          </div>
        </div>
      </header>
      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        pathname={pathname}
        phone={phone}
        phoneHref={phoneHref}
        address={address}
        hours={hours}
        social={social}
      />
    </>
  );
}

function MobileMenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="mobile-menu"
      className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-control font-medium text-ink transition-colors hover:bg-sage-50 md:hidden"
    >
      <span>Menü</span>
      <MenuIcon className="size-5" />
    </button>
  );
}

function MobileMenu({
  open,
  onClose,
  pathname,
  phone,
  phoneHref,
  address,
  hours,
  social,
}: HeaderProps & { open: boolean; onClose: () => void; pathname: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [rendered, setRendered] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  // Close when the route changes (a link inside the menu was followed).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      close();
    }
  }, [pathname, close]);

  // One timeline, played forward to open and reversed to close. Under reduced motion it is
  // never built and the panel simply appears and disappears.
  useGSAP(
    () => {
      const root = panel.current;
      if (!root) return;
      const media = gsap.matchMedia();
      media.add(MOTION_QUERY, () => {
        timeline.current = gsap
          .timeline({ paused: true, onReverseComplete: () => setRendered(false) })
          .fromTo(root, { yPercent: -100 }, { yPercent: 0, duration: 0.55, ease: 'expo.out' })
          .fromTo(
            root.querySelectorAll('[data-menu-item]'),
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', stagger: 0.05 },
            '-=0.3',
          );
        return () => {
          timeline.current = null;
        };
      });
      return () => media.revert();
    },
    { scope: panel },
  );

  useEffect(() => {
    const root = document.documentElement;
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      setRendered(true);
      root.style.overflow = 'hidden';
      if (timeline.current) timeline.current.timeScale(1).play();
      window.requestAnimationFrame(() => {
        panel.current?.querySelector<HTMLElement>('a, button')?.focus();
      });
    } else {
      root.style.overflow = '';
      if (timeline.current && timeline.current.progress() > 0)
        timeline.current.timeScale(1.6).reverse();
      else setRendered(false);
      restoreFocus.current?.focus?.();
      restoreFocus.current = null;
    }
  }, [open]);

  // Escape closes; Tab is kept inside the open dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const visible = open || rendered;

  return (
    <div
      ref={panel}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      inert={!open}
      className={cn(
        'surface-sage fixed inset-0 z-50 flex flex-col overflow-y-auto md:hidden',
        visible ? 'visible' : 'invisible',
      )}
    >
      <h2 id={titleId} className="sr-only">
        Menü
      </h2>
      {/* Same geometry as the header bar, so "Bezárás" lands exactly where "Menü" was. */}
      <div className="mx-auto mt-3 w-full max-w-wide shrink-0 px-gutter sm:mt-4">
        <div className="flex h-[3.75rem] items-center justify-between rounded-panel bg-white pl-4 pr-2.5 shadow-soft sm:pl-5">
          <Wordmark onNavigate={close} />
          <button
            type="button"
            onClick={close}
            className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-control font-medium text-ink hover:bg-sage-50"
          >
            <span>Bezárás</span>
            <CloseIcon className="size-5" />
          </button>
        </div>
      </div>

      <nav aria-label="Mobil navigáció" className="px-gutter pt-8">
        <ul className="flex flex-col">
          {PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href} data-menu-item className="border-b border-sage-900/10">
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between py-4 font-display text-display-md',
                    active ? 'text-sage-800' : 'text-ink',
                  )}
                >
                  {item.label}
                  {active ? <span className="sr-only">(jelenlegi oldal)</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        data-menu-item
        className="mt-auto space-y-6 px-gutter pb-10 pt-12 text-small text-ink-sage"
      >
        <p className="text-body text-ink">{address}</p>
        <dl className="grid gap-1">
          {hours.map((row) => (
            <div key={row.days} className="flex justify-between gap-4">
              <dt>{row.days}</dt>
              <dd className="tabular text-ink">{row.time}</dd>
            </div>
          ))}
        </dl>
        {phoneHref && phone ? (
          <ButtonLink href={phoneHref} className="w-full">
            <PhoneIcon className="size-4" />
            Asztalfoglalás: {phone}
          </ButtonLink>
        ) : null}
        {social.length > 0 ? (
          <ul className="flex gap-2" aria-label="Közösségi oldalak">
            {social.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-control border border-sage-900/15 text-ink transition-colors hover:bg-sage-100"
                >
                  <SocialIcon platform={link.platform} className="size-5" />
                  <span className="sr-only">
                    {isSocialPlatform(link.platform)
                      ? PLATFORM_LABEL[link.platform]
                      : link.platform}{' '}
                    (új lapon)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
