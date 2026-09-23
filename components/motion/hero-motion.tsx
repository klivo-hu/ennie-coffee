'use client';

import { useRef, type ReactNode } from 'react';
import { MOTION_LEVEL, MOTION_QUERY, gsap, useGSAP } from '@/lib/motion/gsap';

const GATE_CLASS = 'hero-motion';

/**
 * The hero entrance — the one strong moment of motion on a page.
 *
 * The inline gate in app/layout.tsx hides the entering parts before first paint (only when
 * scripts run and motion is allowed). This timeline takes over that starting state and removes the
 * gate in the same frame, so there is no flash between the server-rendered page and the
 * animation. If the gate already timed out (a slow bundle), the entrance is skipped entirely: the
 * content is on screen and stays still, rather than vanishing to replay.
 *
 * Targets, all scoped to this hero:
 * - [data-hero-line]      headline lines rising out of their mask
 * - [data-hero-enter]     supporting copy and actions, fading up in order
 * - [data-hero-curtain]   a sage panel lifting off the main image
 * - [data-hero-image]     the main image settling from a slight scale
 * - [data-hero-accent]    the layered secondary image
 * - [data-hero-shape]     the organic form behind the imagery
 * - [data-parallax="slow" | "fast"]  depth while scrolling away (level 3)
 */
export function HeroMotion({
  children,
  className,
  variant = 'home',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'home' | 'page';
}) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = container.current;
      const html = document.documentElement;
      if (!root) return;
      // A page opened in a background tab gets no entrance: nobody would see it, and the visitor
      // should find the finished page waiting when they switch to it.
      const gated = html.classList.contains(GATE_CLASS) && document.visibilityState === 'visible';
      if (!gated) html.classList.remove(GATE_CLASS);
      const media = gsap.matchMedia();

      media.add(MOTION_QUERY, () => {
        if (gated) {
          const q = gsap.utils.selector(root);
          const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
          intro
            .set(q('[data-hero-line]'), { yPercent: 105 })
            .set(q('[data-hero-enter], [data-hero-accent], [data-hero-shape]'), { opacity: 0 })
            .set(q('[data-hero-enter]'), { y: 18 })
            .set(q('[data-hero-curtain]'), { scaleY: 1 });
          html.classList.remove(GATE_CLASS);

          const home = variant === 'home';
          intro
            .fromTo(
              q('[data-hero-shape]'),
              { opacity: 0, scale: 0.94 },
              { opacity: 1, scale: 1, duration: 1.8 },
              0,
            )
            .to(
              q('[data-hero-curtain]'),
              { scaleY: 0, duration: home ? 1.25 : 1, ease: 'expo.inOut' },
              0.05,
            )
            .fromTo(
              q('[data-hero-image]'),
              { scale: 1.1 },
              { scale: 1, duration: home ? 1.9 : 1.5 },
              0.05,
            )
            .to(
              q('[data-hero-line]'),
              { yPercent: 0, duration: 1.05, stagger: 0.09 },
              home ? 0.25 : 0.15,
            )
            .to(
              q('[data-hero-enter]'),
              { opacity: 1, y: 0, duration: 0.85, stagger: 0.08 },
              home ? 0.55 : 0.4,
            )
            .fromTo(
              q('[data-hero-accent]'),
              { opacity: 0, y: 36 },
              { opacity: 1, y: 0, duration: 1.1 },
              0.75,
            );
        }

        if (MOTION_LEVEL >= 3) {
          const scroll = {
            trigger: root,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
            invalidateOnRefresh: true,
          };
          gsap.to(gsap.utils.toArray('[data-parallax="slow"]', root), {
            yPercent: -5,
            ease: 'none',
            scrollTrigger: scroll,
          });
          gsap.to(gsap.utils.toArray('[data-parallax="fast"]', root), {
            yPercent: -16,
            ease: 'none',
            scrollTrigger: scroll,
          });
        }
      });

      // Reduced motion: the finished state, immediately.
      media.add('(prefers-reduced-motion: reduce)', () => {
        html.classList.remove(GATE_CLASS);
      });

      return () => media.revert();
    },
    { scope: container, dependencies: [variant] },
  );

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}
