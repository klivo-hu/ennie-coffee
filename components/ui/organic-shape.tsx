import { cn } from '@/lib/cn';

/**
 * Soft organic forms behind imagery — drawn by hand, never a circle standing in for an organic
 * contour. Purely decorative, so hidden from assistive technology.
 */
const SHAPES = {
  pebble:
    'M332 26C420 30 508 70 548 146C586 218 562 290 578 364C596 446 548 530 466 562C388 592 330 552 250 566C168 580 88 552 52 478C16 404 50 334 38 262C26 186 46 108 110 66C172 26 250 22 332 26Z',
  leaf: 'M300 40C392 30 470 70 520 140C572 214 580 300 548 380C514 462 440 526 350 550C256 574 162 548 102 486C44 426 26 340 44 262C62 180 118 112 190 72C224 54 262 44 300 40Z',
  drift:
    'M268 46C352 22 452 44 512 110C570 174 574 262 552 342C528 428 470 504 384 540C300 576 196 572 128 520C60 468 30 380 40 298C50 214 94 150 150 104C186 74 224 58 268 46Z',
} as const;

export function OrganicShape({
  shape = 'pebble',
  className,
  ...props
}: { shape?: keyof typeof SHAPES; className?: string } & React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 600 600"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none', className)}
      {...props}
    >
      <path d={SHAPES[shape]} fill="currentColor" />
    </svg>
  );
}
