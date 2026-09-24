# Project Memory — ennie-coffee

> Persistent institutional memory for this project. Read before deciding; update after
> significant work. Managed with the CEF Memory Engine.

## Project summary

A **fullstack** built with **nextjs** (typescript).
Created 2026-09-23T16:52:13.898Z with CEF 0.1.0.
Primary language: hu. Country: Hungary.

## Architecture decisions

- Framework: **nextjs**; styling: **tailwind**; UI: **shadcn**; animation: **gsap**.
- Data: **JSON file store** on a mounted Docker volume (`lib/store/`, `DATA_DIR`).
  PostgreSQL + Drizzle were removed on 2026-09-24. The dataset is a menu, a few links, one
  administrator and the sessions and audit entries those produce — a few hundred records. A
  database container was a second thing to run, patch, back up and fail independently, and it
  was what the production stack was failing on (the app replicas waited forever on an unhealthy
  `db`, so Traefik had nothing to route to). `lib/store/json-store.ts` is the only module that
  knows where bytes go: atomic writes (temp file → `fsync` → `rename`), serialised per file,
  cached in memory afterwards. Swapping in a database later means reimplementing that one file.
- Deployment target: **docker**; one container, port 80, on the Klivo hosting platform.
  `hosting_ennie-coffee_web` on `client_ennie-coffee_net`, volume at `/app/data`. The panel's
  container port must be 80. The bundled HAProxy layer and the two app replicas were removed
  with the database: a single process makes the content cache and the rate-limit counters exact
  instead of eventually consistent.
- Enabled engines: accessibility, ai-seo, architecture, components, core, deployment, design, docker, experience, legal, motion, performance, platform, security, seo, validation.

## User requirements

- Project type: fullstack.
- Features: admin panel.
- Legal pages: yes; AI-SEO files: yes.

## Outstanding tasks

- [ ] Replace generated legal copy with reviewed, jurisdiction-correct text.
- [ ] Confirm the panel's container port for this site is **80** — a mismatch is a 502 with no
      other symptom in any log.
- [ ] Back up the `/app/data` volume on a schedule; it is the whole site's state.

## Future ideas

- Capture ideas here as they arise, with the reason they matter.

## Known constraints

- Legal documents are generated as drafts and MUST be reviewed by a qualified legal
  professional before publication.
- The hosting platform's compose validator rejects any `security_opt` key by name, regardless of
  its value — `no-new-privileges` cannot be set here without failing the deploy.
- `read_only: true` must not be set on the container: Next.js writes optimized images to
  `.next/cache`, and EROFS there is logged but not fatal, so the failure would be silent.
- The platform's review preview copies only `build`, `image`, `environment`, `expose` and
  `command` from the first service (or the one whose `container_name` matches the live one) —
  never `env_file` or `volumes`. The site must therefore render correctly from one container
  with no secrets and no volume, which it does: it seeds itself and serves with the admin off.
- Single instance by design. `lib/security/rate-limit.ts` counts in process memory and
  `lib/content/cache.ts` caches in process memory; both would have to move to a shared store
  before this site could run more than one replica.
