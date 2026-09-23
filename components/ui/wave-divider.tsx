import { WaveDrift } from '@/components/motion/wave-drift';
import { cn } from '@/lib/cn';
import { SURFACE_CLASS, type SurfaceTone } from './surface';

/**
 * The waves lead into the three section surfaces, plus the footer's forest green — site chrome
 * rather than a section background, so the section palette stays at three.
 */
export type WaveTone = SurfaceTone | 'forest';
const TONE_CLASS: Record<WaveTone, string> = { ...SURFACE_CLASS, forest: 'bg-sage-900' };

/**
 * The organic wave between two sections — the site's recurring motif.
 *
 * Each path is drawn by hand on a 1440 × 120 grid: crests of unequal width and height, shoulders
 * that lean rather than mirror, no repeating period. That irregularity is what separates a
 * designed edge from a generated sine wave.
 *
 * The wave is not a colored SVG laid over the seam. It is a masked copy of the *next* section's
 * surface (color and paper grain included), sitting just above that section, so the textured tone
 * continues into the curve without a visible join at any width.
 */
const PATHS = {
  gentle:
    'M0 70C92 52 170 40 262 47C356 54 392 84 484 86C582 88 626 44 724 33C826 22 902 55 1000 64C1094 73 1150 47 1240 39C1330 31 1392 47 1440 57V120H0Z',
  flowing:
    'M0 88C112 90 156 44 272 37C394 30 424 70 546 73C664 76 708 47 812 44C916 41 952 77 1064 79C1172 81 1232 36 1334 30C1390 27 1422 38 1440 45V120H0Z',
  soft: 'M0 54C64 45 126 41 190 49C256 57 286 80 364 80C442 80 476 55 556 51C640 47 694 71 776 73C862 75 900 41 994 37C1088 33 1126 66 1210 70C1294 74 1362 57 1440 51V120H0Z',
} as const;

export type WaveVariant = keyof typeof PATHS;

function maskUrl(path: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 120' preserveAspectRatio='none'><path d='${path}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function WaveDivider({
  tone,
  variant = 'gentle',
  flip = false,
  className,
}: {
  /** The surface of the region this wave leads into. */
  tone: WaveTone;
  variant?: WaveVariant;
  flip?: boolean;
  className?: string;
}) {
  const mask = maskUrl(PATHS[variant]);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-full h-[clamp(2.25rem,1.4rem+3.6vw,5.5rem)] overflow-x-clip',
        className,
      )}
    >
      <WaveDrift>
        <div
          className={cn(
            'absolute inset-y-0 -left-[4%] w-[108%]',
            TONE_CLASS[tone],
            flip && '-scale-x-100',
          )}
          style={{
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            // A hair of overlap into the section below hides sub-pixel seams on fractional DPRs.
            bottom: '-1px',
          }}
        />
      </WaveDrift>
    </div>
  );
}
