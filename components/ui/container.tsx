import { cn } from '@/lib/cn';

const WIDTH = {
  wide: 'max-w-wide',
  content: 'max-w-content',
  text: 'max-w-text',
} as const;

/** Centers content on the page grid with the fluid gutter (never less than 20px at phone width). */
export function Container({
  width = 'wide',
  className,
  children,
}: {
  width?: keyof typeof WIDTH;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('mx-auto w-full px-gutter', WIDTH[width], className)}>{children}</div>;
}
