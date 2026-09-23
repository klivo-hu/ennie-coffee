'use client';

import type { ReactNode } from 'react';
import { useScrollAnimation } from '@/lib/motion/use-scroll-animation';

/**
 * Drifts an image layer slower than the page across its own scroll range, separating the picture
 * from the frame around it. Place it inside a positioned, clipped frame; the layer overscans the
 * frame (120% tall, starting 10% above) so the ±8% drift of the `parallax-media` preset never
 * exposes an edge. Skipped below motion level 3 and under reduced motion, where the image simply
 * sits in its frame.
 */
export function Parallax({ children }: { children: ReactNode }) {
  const container = useScrollAnimation<HTMLDivElement>('parallax-media', ':scope > *');

  return (
    <div ref={container} className="absolute inset-0">
      <div className="absolute inset-x-0 -top-[10%] h-[120%]">{children}</div>
    </div>
  );
}
