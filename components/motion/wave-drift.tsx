'use client';

import { useRef, type ReactNode } from 'react';
import { MOTION_LEVEL, MOTION_QUERY, gsap, useGSAP } from '@/lib/motion/gsap';

/** Parallax needs level 3; the drift is the same family of effect, sideways. */
const MINIMUM_LEVEL = 3;
/** ±1.5% of a 108%-wide layer: enough to feel the edge breathe, far inside the vestibular limit. */
const DRIFT_PERCENT = 1.5;

/**
 * Lets a wave divider drift sideways a little as it crosses the viewport, so the section edges
 * feel poured rather than cut. Scrubbed to native scroll (the scrollbar is the clock), transform
 * only, and absent under reduced motion — the wave then simply sits still.
 */
export function WaveDrift({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = container.current;
      if (!root || MOTION_LEVEL < MINIMUM_LEVEL) return;
      const media = gsap.matchMedia();
      media.add(MOTION_QUERY, () => {
        gsap.fromTo(
          root,
          { xPercent: -DRIFT_PERCENT },
          {
            xPercent: DRIFT_PERCENT,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );
      });
      return () => media.revert();
    },
    { scope: container },
  );

  return (
    <div ref={container} className="absolute inset-0">
      {children}
    </div>
  );
}
