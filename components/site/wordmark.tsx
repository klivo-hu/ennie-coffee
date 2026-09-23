import { Link } from '@/components/ui/link';
import { cn } from '@/lib/cn';

/**
 * The typographic wordmark. The café's badge logo (docs/brand/logo-source.jpg) is an ornate dark
 * leather-and-gold emblem that does not hold up at header size or on the light sage palette; the
 * wordmark carries the name in the site's own display face instead.
 */
export function Wordmark({
  className,
  size = 'md',
  tone = 'dark',
  onNavigate,
}: {
  className?: string;
  size?: 'md' | 'lg';
  /** `light` for the forest-green footer. */
  tone?: 'dark' | 'light';
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn(
        'group inline-flex items-baseline gap-2 rounded-inline',
        tone === 'dark' ? 'text-ink' : 'text-ivory focus-visible:outline-ivory',
        className,
      )}
      aria-label="Ennie Coffee – főoldal"
    >
      <span
        className={cn(
          'font-display font-[460] leading-none tracking-[-0.015em]',
          size === 'md' ? 'text-title' : 'text-display-md',
        )}
      >
        Ennie
      </span>
      <span
        className={cn(
          'font-display italic leading-none',
          tone === 'dark' ? 'text-sage-700' : 'text-sage-200',
          size === 'md' ? 'text-title' : 'text-display-md',
        )}
      >
        Coffee
      </span>
    </Link>
  );
}
