'use client';

/**
 * The project's one GSAP registration site.
 *
 * Registering in a single module is what makes the plugin survive tree-shaking in a production
 * build, and it keeps the motion setup owned by one file rather than repeated wherever an
 * animation happens to be written. Import GSAP from here, never from 'gsap' directly.
 */

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The motion level this surface is built at (0-4). Effects declaring a higher minimum level are
 * skipped rather than downgraded: a dashboard does not get a quieter pinned section, it gets none.
 *
 * The public site is a marketing surface (default 3, ceiling 4 in motion.policy.yaml); level 3
 * admits the gentle image parallax and wave drift the design relies on. Recorded in
 * .claude/memory/decisions.md. The admin area imports no motion at all.
 */
export const MOTION_LEVEL = 3;

/** The media query the motion branch runs under. Anything else gets the finished state. */
export const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';

export { gsap, ScrollTrigger, useGSAP };
