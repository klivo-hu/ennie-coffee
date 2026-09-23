'use client';

import { createElement, type ReactNode } from 'react';
import { useScrollAnimation } from '@/lib/motion/use-scroll-animation';

/** The elements Reveal may render as. A closed set keeps the ref typed without a generic. */
type RevealTag = 'div' | 'section' | 'ul' | 'ol';

interface RevealProps {
  readonly children: ReactNode;
  /** `item` staggers direct children in sequence; `self` animates the block as one. */
  readonly mode?: 'self' | 'item';
  /** Render as the element the content actually needs — a list stays a list. */
  readonly as?: RevealTag;
  readonly className?: string;
}

/**
 * Fades and rises content as it enters the viewport, once. The children render normally and are
 * hidden by the hook only when motion is actually going to run, so a reader with reduced motion,
 * a failed script, or no JavaScript sees the finished section rather than an empty one.
 */
export function Reveal({ children, mode = 'self', as: tag = 'div', className }: RevealProps) {
  // ':scope > *' animates the direct children without asking the caller to mark them up, so
  // <Reveal as="ul" mode="item"> around a list staggers its items and adds no wrapper element.
  const container = useScrollAnimation<HTMLElement>(
    mode === 'item' ? 'reveal-stagger' : 'reveal-rise',
    mode === 'item' ? ':scope > *' : 'self',
  );

  // createElement rather than a <Tag> literal: a JSX tag whose type is a union of intrinsic
  // elements cannot resolve one ref type, and this keeps the component honest about rendering the
  // element the content needs — a list stays a list — without a cast at the call site.
  return createElement(tag, { ref: container, className }, children);
}
