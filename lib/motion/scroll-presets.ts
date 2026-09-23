/**
 * Scroll-motion presets — generated from the CEF design system. Do not edit by hand; change the
 * design system and regenerate, so the project's timings stay the framework's timings.
 *
 * Durations are seconds (GSAP's unit). Every ease is an ease-out family curve: nothing overshoots.
 * A scrubbed preset carries ease 'none' because the scrollbar is already the clock.
 */

export interface ScrollTweenVars {
  readonly opacity?: number;
  readonly x?: number;
  readonly y?: number;
  readonly xPercent?: number;
  readonly yPercent?: number;
  readonly scale?: number;
}

export interface ScrollTriggerVars {
  readonly start: string;
  readonly end?: string;
  readonly scrub?: number | boolean;
  readonly pin?: boolean;
  readonly once?: boolean;
  readonly toggleActions?: string;
  readonly invalidateOnRefresh?: boolean;
}

export interface ScrollPreset {
  readonly from: ScrollTweenVars;
  readonly to?: ScrollTweenVars;
  readonly duration: number;
  readonly ease: string;
  readonly stagger?: number;
  /** The motion level this effect needs (0-4). Compared against MOTION_LEVEL below. */
  readonly minimumLevel: number;
  readonly scrollTrigger: ScrollTriggerVars;
}

export const SCROLL_PRESETS = {
  'reveal-rise': {
    from: { opacity: 0, y: 24 },
    to: undefined,
    duration: 0.4,
    ease: 'power3.out',
    stagger: undefined,
    minimumLevel: 2,
    scrollTrigger: { start: 'top 85%', once: true, toggleActions: 'play none none none' },
  },
  'reveal-stagger': {
    from: { opacity: 0, y: 20 },
    to: undefined,
    duration: 0.4,
    ease: 'power3.out',
    stagger: 0.06,
    minimumLevel: 2,
    scrollTrigger: { start: 'top 80%', once: true, toggleActions: 'play none none none' },
  },
  'parallax-media': {
    from: { yPercent: -8 },
    to: { yPercent: 8 },
    duration: 0.25,
    ease: 'none',
    stagger: undefined,
    minimumLevel: 3,
    scrollTrigger: {
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  },
  'pin-section': {
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0 },
    duration: 0.25,
    ease: 'none',
    stagger: undefined,
    minimumLevel: 3,
    scrollTrigger: {
      start: 'top top',
      end: '+=100%',
      scrub: 1,
      pin: true,
      invalidateOnRefresh: true,
    },
  },
  'scrub-scale': {
    from: { scale: 1.08 },
    to: { scale: 1 },
    duration: 0.25,
    ease: 'none',
    stagger: undefined,
    minimumLevel: 3,
    scrollTrigger: { start: 'top bottom', end: 'top 40%', scrub: 0.5, invalidateOnRefresh: true },
  },
  'progress-bar': {
    from: { xPercent: -100 },
    to: { xPercent: 0 },
    duration: 0.15,
    ease: 'none',
    stagger: undefined,
    minimumLevel: 1,
    scrollTrigger: {
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
    },
  },
  'counter-count-up': {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 0.6,
    ease: 'power3.out',
    stagger: undefined,
    minimumLevel: 2,
    scrollTrigger: { start: 'top 80%', once: true, toggleActions: 'play none none none' },
  },
} as const satisfies Record<string, ScrollPreset>;

export type ScrollPresetId = keyof typeof SCROLL_PRESETS;
