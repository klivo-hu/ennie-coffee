# Deploying ennie-coffee

This project deploys on the **Klivo Docker hosting platform** (Traefik reverse proxy, one
container per site). No CI is required — the platform builds and runs the repository's
`docker-compose.yml` on deploy.

## The shape of the deployment

```
Traefik  ──▶  hosting_ennie-coffee_web   (one Next.js container, port 3000)
                        │
                        └── ennie-data volume at /app/data
```

One container, one volume, no database. Everything the site stores — the menu, the administrator
accounts, the sessions, the audit log and the uploaded imagery — lives in JSON files and encoded
image files under `/app/data` (`lib/store/json-store.ts`). Writes are atomic (temp file, `fsync`,
`rename`) and serialised per file, so a crash can never leave a half-written menu, and a restart
never loses an edit that the admin reported as saved.

| File                       | Purpose                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Dockerfile`               | Multi-stage build. `dev` stage for local hot reload; `runner` stage is the Next.js **standalone** runtime listening on port 3000 as a non-root user. |
| `docker-compose.yml`       | **Production.** The platform-contract compose: container `hosting_ennie-coffee_web`, network `client_ennie-coffee_net`, `env_file: .env`, one named volume, capped logs, no Docker labels. |
| `docker-compose.local.yml` | **Local only.** The same image and topology on `localhost:8080`, so you can check the production build before pushing.                            |
| `docker-compose.dev.yml`   | **Local only.** Bind-mounted source, hot reload, published on `localhost:3000`.                                                                   |
| `.dockerignore`            | Keeps `.env`, `.git`, `node_modules`, `.next`, `data/` and the compose files out of the build context.                                            |

`next.config.mjs` sets `output: 'standalone'`, which the Dockerfile relies on.

### Three names that must match

A 502 from Traefik almost always means one of these is wrong, and nothing else in the logs says so:

1. **Container name** — `hosting_ennie-coffee_web`. Traefik routes to this name; it embeds the
   client slug created in the panel. A different slug means regenerating with
   `cef generate --client-slug <your-slug>`, or editing `container_name` and the network name
   together.
2. **Network** — `client_ennie-coffee_net`, declared `external` because the platform creates it
   (and attaches Traefik to it) before the deploy.
3. **Container port** — **3000**, both in the panel (Sites → site → Container port) and in the
   Dockerfile's `PORT`. This matches the other sites on the platform. The panel's own default
   for a new site is 80, so check it: if it says 80, either change it to 3000 or leave it and
   set `PORT=80` in the site's Environment. The server and its health check both follow `PORT`,
   so moving the port never needs a rebuild — but the two values must agree, and when they do
   not the only symptom is the platform's "site unavailable" page.

### Why two local compose files

The platform runs the site's `docker-compose.yml` **verbatim**, so that file is production and
nothing else — no published host ports, no bind mounts, no dev-only environment. Local work uses
the other two files, passed explicitly with `-f`.

> ⚠ Do not rename either of them to `docker-compose.override.yml`. Compose merges an override file
> automatically, and the platform deploys with a plain `docker compose up` in the site directory —
> so an override would apply your local settings in production, and would do it past the security
> validator, which only inspects the base file.

## Local development

```bash
docker compose -f docker-compose.dev.yml up --build
```

Then open <http://localhost:3000>. Edits to the source reload in place; only a dependency change
needs `--build` again.

Before pushing, check the **production** image on your own machine:

```bash
docker compose -f docker-compose.local.yml up --build
```

Then open <http://localhost:8080> (admin at `/admin`). This is the same image, the same single
container and the same volume layout the platform will run.

A bare `docker compose up --build` builds the production file, which is what the platform does —
but it fails locally at the network step, because `client_ennie-coffee_net` is created by the
platform and not by you. To run the production file locally anyway, create the network first:

```bash
docker network create client_ennie-coffee_net
```

## Deploy steps

1. **Create the client/site in the panel** with the slug **`ennie-coffee`** (Clients → New Client →
   set the domain; template _None_ for a repo deploy). The container name and network above must
   match this slug.
2. **Container port** must be **3000**, matching the image's `PORT`. Set it explicitly — the
   panel defaults a new site to 80.
3. **Environment**: set runtime variables under **Sites → site → Environment**. At minimum:
   - `SITE_URL` — the site's public URL;
   - `JWT_ACCESS_SECRET` and `APP_ENCRYPTION_KEY` — 32+ random characters each
     (`openssl rand -base64 48`); without the first, the admin area stays switched off and the
     public site still serves the price list;
   - `ADMIN_BOOTSTRAP_USERNAME` and `ADMIN_BOOTSTRAP_PASSWORD` — the first administrator, created
     on first start and ignored afterwards.

   The panel writes `.env`, which the compose loads via `env_file`. Secrets are never baked into
   the image. See `.env.example` for the full list.
4. **Point the code at the platform**: set the client's GitHub repo + branch and **Deploy now**,
   or push to the configured branch to auto-deploy (webhook).
5. The platform validates the compose (rejecting privileged mode, the Docker socket, or foreign
   networks), builds the image, starts `hosting_ennie-coffee_web` on `client_ennie-coffee_net`,
   and Traefik routes the domain to it — issuing a Let's Encrypt certificate on first request.

### The first start

On a fresh volume the container seeds itself: the café's published menu and links are written to
`/app/data`, and the six category photographs in `assets/menu/` are encoded into their AVIF and
WebP variants. That takes some seconds, which is why the container's health check has a long
start period. Every later start finds the data already there and skips the whole step — the seed
never overwrites anything the owner has edited.

While seeding is still running, the price list renders from the same published menu compiled into
the bundle, so the first visitor sees a complete site rather than an empty one.

## What lives in the volume

```
/app/data
├── categories.json     the price list's sections
├── products.json       every product, with its prices
├── social.json         social profiles and ordering links
├── media.json          image metadata (dimensions, blur preview, dominant colour)
├── media/<id>/         the encoded AVIF and WebP variants of each image
├── admins.json         administrator accounts (Argon2id hashes, encrypted TOTP secrets)
├── sessions.json       refresh-token sessions
└── audit.json          the administrative action log
```

Backing the site up means backing up this one directory — the panel's volume backup covers it.
Restoring it into a fresh container restores the site exactly, because nothing durable lives
anywhere else.

Sessions older than 30 days and audit entries older than a year are swept automatically every six
hours, matching the retention stated in the privacy notice.

## Health and monitoring

| Endpoint             | Answers                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| `/api/health/live`   | The process is up. Liveness only.                                             |
| `/api/health/ready`  | The server is serving, plus `store`: `ready`, `pending` or `failed`.          |

A `failed` store means the data directory could not be written — a volume mounted read-only, or a
permission mismatch after a restore. The site stays up and serves the published menu; the admin
area is what stops working, so this is the field to watch rather than the HTTP status.
