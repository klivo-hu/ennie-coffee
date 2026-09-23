import { cn } from '@/lib/cn';
import { SURFACE_CLASS, type SurfaceTone } from './surface';
import { WaveDivider, type WaveVariant } from './wave-divider';

/**
 * A page region on one of the three surfaces, optionally opening with the organic wave. The wave
 * is drawn in this region's own surface and rises into the one above, so any pairing of tones
 * joins cleanly. `as` keeps landmarks honest: the site footer renders as a real <footer>.
 */
export function Section({
  as: Tag = 'section',
  tone,
  wave,
  spacing = 'default',
  className,
  children,
  ...props
}: {
  as?: 'section' | 'footer' | 'div';
  tone: SurfaceTone;
  /** Draw a wave at the top edge. Omit where the previous region shares this tone. */
  wave?: { variant?: WaveVariant; flip?: boolean };
  spacing?: 'default' | 'tight' | 'none';
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag
      className={cn(
        // Clipped sideways only: decorative patches may spill past the grid without ever causing a
        // horizontal scroll, while the wave above and sticky columns inside keep working.
        'relative overflow-x-clip',
        SURFACE_CLASS[tone],
        spacing === 'default' && 'py-section',
        spacing === 'tight' && 'py-section-tight',
        className,
      )}
      {...props}
    >
      {wave ? <WaveDivider tone={tone} variant={wave.variant} flip={wave.flip} /> : null}
      {children}
    </Tag>
  );
}
