import { cn } from '@/lib/cn';

/**
 * A section's heading and its supporting line. No label above the heading — the heading carries
 * the section on its own, and the lead says what the reader will find.
 */
export function SectionHeading({
  id,
  title,
  lead,
  as: Tag = 'h2',
  size = 'lg',
  align = 'start',
  className,
}: {
  id?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  as?: 'h2' | 'h3';
  size?: 'lg' | 'md';
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto text-center', 'max-w-2xl', className)}>
      <Tag
        id={id}
        className={cn(
          'font-display text-ink',
          size === 'lg' ? 'text-display-lg' : 'text-display-md',
        )}
      >
        {title}
      </Tag>
      {lead ? (
        <p className={cn('mt-5 text-lead text-muted', align === 'center' && 'mx-auto', 'max-w-xl')}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
