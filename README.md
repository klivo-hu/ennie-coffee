# ennie-coffee

The public website and admin panel for Ennie Coffee Kávéház, Hatvan.

## Getting started

```bash
npm install
npm run dev
```

The site reads and writes `./data` locally (override with `DATA_DIR`). It is created and seeded
with the café's published menu on first start; the directory is git-ignored.

## How the data is stored

There is no database. The menu, the administrator accounts, the sessions, the audit log and the
uploaded imagery live in JSON files and encoded image files under `DATA_DIR`, which production
mounts as a Docker volume. `lib/store/json-store.ts` provides the collections every other module
uses, and it is the only file that knows where the bytes go: writes are atomic (temp file,
`fsync`, `rename`), serialised per file, and served from memory afterwards.

```
data/
├── categories.json  products.json  social.json   the price list
├── media.json + media/<id>/…                     images and their variants
├── admins.json  sessions.json  audit.json        the admin area
```

## Docker

Three stacks, three files. Only `docker-compose.yml` is production, and the hosting platform runs
it verbatim — so local conveniences never go in it. See `deploy/DEPLOY.md`.

```bash
# hot reload, http://localhost:3000
docker compose -f docker-compose.dev.yml up --build

# the production image and topology, http://localhost:8080
docker compose -f docker-compose.local.yml up --build
```

## Quality gate

`npm run verify` runs the full chain — types, lint, formatting, tests — in the order CEF
reviews them. Run it before every commit and before every deploy.

```bash
npm run verify
```

Design tokens live in `app/globals.css` as CSS custom properties. Components read tokens,
never hard-coded values.
