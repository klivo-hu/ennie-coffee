import { cn } from '@/lib/cn';
import { OrganicShape } from './organic-shape';
import type { SurfaceTone } from './surface';

/**
 * A soft organic color patch behind a photograph — the site's second recurring motif, alongside
 * the wave. One vocabulary everywhere: soft sage on the light surfaces, warm ivory on the sage
 * surface, always offset toward one corner of the image so the picture seems to rest on it.
 *
 * Place it as the first child of a `relative isolate` wrapper around the image frame: `isolate`
 * gives the wrapper its own stacking context, so the patch (z −1) sits behind the image but above
 * the section background.
 */
export function Patch({
  shape = 'pebble',
  surface,
  className,
}: {
  shape?: 'pebble' | 'leaf' | 'drift';
  /** The section surface the patch sits on, which decides its color. */
  surface: SurfaceTone;
  className?: string;
}) {
  return (
    <OrganicShape
      shape={shape}
      className={cn(
        'absolute -z-10',
        surface === 'sage' ? 'text-ivory' : 'text-sage-100',
        className,
      )}
    />
  );
}
