import { cva, type VariantProps } from 'class-variance-authority';
import { Link } from '@/components/ui/link';
import { cn } from '@/lib/cn';
import { ArrowIcon } from './icons';

/**
 * The single source for actionable styling. Rounded, not capsule; a 48px touch target; a quiet
 * lift and an arrow that moves on hover. Everything is CSS — hover and press are state changes,
 * not choreography.
 */
export const buttonVariants = cva(
  [
    'group/button relative inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-control',
    'font-sans text-control font-medium tracking-label',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-base ease-standard',
    'focus-visible:outline-offset-4 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-sage-800 text-ivory hover:-translate-y-px hover:bg-sage-900 hover:shadow-soft',
        secondary:
          'border border-ink/20 bg-transparent text-ink hover:-translate-y-px hover:border-ink/40 hover:bg-white/60',
        quiet:
          'px-0 text-sage-800 underline decoration-sage-800/30 decoration-1 underline-offset-[0.35em] hover:text-sage-900 hover:decoration-sage-900',
      },
      size: {
        md: 'h-12 px-6',
        sm: 'h-10 px-4',
      },
    },
    compoundVariants: [{ variant: 'quiet', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

function Arrow() {
  return (
    <ArrowIcon className="size-4 shrink-0 transition-transform duration-base ease-out group-hover/button:translate-x-[3px]" />
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  readonly arrow?: boolean;
}

/** An action button. Use `ButtonLink` for navigation. */
export function Button({
  className,
  variant,
  size,
  arrow,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
      {arrow ? <Arrow /> : null}
    </button>
  );
}

/**
 * A link styled as a button. External links open in a new tab with `noopener` and say so to
 * assistive technology.
 */
export function ButtonLink({
  href,
  className,
  variant,
  size,
  arrow = false,
  external = false,
  children,
  ...props
}: ButtonVariants & {
  href: string;
  className?: string;
  arrow?: boolean;
  external?: boolean;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (external || /^(https?:|tel:|mailto:)/.test(href)) {
    const newTab = external || href.startsWith('http');
    return (
      <a
        href={href}
        className={classes}
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props}
      >
        {children}
        {newTab ? <span className="sr-only"> (új lapon nyílik meg)</span> : null}
        {arrow ? <Arrow /> : null}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  );
}
