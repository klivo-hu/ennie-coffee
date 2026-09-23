'use client';

import { useRef } from 'react';
import { MOTION_LEVEL, MOTION_QUERY, gsap, useGSAP } from './gsap';
import { SCROLL_PRESETS, type ScrollPresetId } from './scroll-presets';

/**
 * Runs one scroll preset against the elements matching `selector` inside a scoped container.
 *
 * Three properties are guaranteed here rather than left to each call site. Animations are created
 * inside `useGSAP`, so every tween, ScrollTrigger, and pin spacing is reverted on unmount and
 * React Strict Mode's double mount cannot stack them. Selector text is scoped to the returned
 * container ref, so a second instance of a component never animates the first one. And the whole
 * effect lives inside a `gsap.matchMedia` branch keyed to `prefers-reduced-motion`, so the
 * reduced case is not a slower animation — it is the finished state, reached immediately.
 *
 * The elements are rendered visible. This hook is what hides them, from JavaScript, a frame before
 * animating them back. If the script never runs, the content is simply there.
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  preset: ScrollPresetId,
  /** What to animate: the container itself, or a selector resolved within it. */
  target: 'self' | string,
  options: { readonly enabled?: boolean; readonly trigger?: 'container' | 'page' } = {},
) {
  const container = useRef<T>(null);
  const config = SCROLL_PRESETS[preset];
  const enabled = (options.enabled ?? true) && MOTION_LEVEL >= config.minimumLevel;

  useGSAP(
    () => {
      const root = container.current;
      if (!enabled || root === null) {
        return;
      }
      const media = gsap.matchMedia();
      media.add(MOTION_QUERY, () => {
        const targets = target === 'self' ? [root] : gsap.utils.toArray<HTMLElement>(target, root);
        if (targets.length === 0) {
          return;
        }
        const scrollTrigger = {
          trigger: options.trigger === 'page' ? document.documentElement : root,
          ...config.scrollTrigger,
        };
        const shared = {
          duration: config.duration,
          ease: config.ease,
          stagger: config.stagger,
          scrollTrigger,
        };

        // A preset with no 'to' state animates *from* the hidden state back to the layout the
        // browser already computed. That is what keeps the markup honest: the element's real
        // appearance is its rendered one, and the animation is the only thing that ever hides it.
        if (config.to === undefined) {
          gsap.from(targets, { ...config.from, ...shared });
        } else {
          gsap.fromTo(targets, config.from, { ...config.to, ...shared });
        }
      });
      return () => media.revert();
    },
    { scope: container, dependencies: [preset, target, enabled, options.trigger] },
  );

  return container;
}
