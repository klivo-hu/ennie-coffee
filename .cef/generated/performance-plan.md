# Performance Plan

Rendering: Server-first with client islands for interactive regions; stream slow data.
Images: AVIF/WebP with explicit dimensions, responsive sizes, and a prioritized LCP image.
Caching: Cache static shells at the edge; revalidate dynamic data with explicit TTLs.

## Core Web Vitals targets

- LCP ≤ 2500ms
- CLS ≤ 0.1
- INP ≤ 200ms
- JS budget ≤ 150KB

## Lazy loading

- Lazy-load below-the-fold media.
- Defer non-critical scripts.
- Load heavy widgets (maps, charts) on interaction or when in view.

## Code splitting

- Route-level code splitting by default.
- Dynamically import heavy, rarely-used components.
- Keep third-party scripts off the critical path.
