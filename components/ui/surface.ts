/**
 * The three section surfaces (see the `.surface-*` classes in globals.css). Every major section
 * uses exactly one; only the heroes stand outside the set.
 *
 * - canvas — warm white, clean
 * - sage   — soft pastel sage
 * - paper  — warm white with a barely-there paper grain
 */
export type SurfaceTone = 'canvas' | 'sage' | 'paper';

export const SURFACE_CLASS: Record<SurfaceTone, string> = {
  canvas: 'surface-canvas',
  sage: 'surface-sage',
  paper: 'surface-paper',
};
