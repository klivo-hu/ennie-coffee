# Deploying ennie-coffee

This project is generated to deploy on the **Klivo Docker hosting platform**
(Traefik reverse proxy, one container per site). No CI is required — the platform
builds and runs the repository's `docker-compose.yml` on deploy.

## What CEF generated for deployment

| File                     | Purpose                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Dockerfile`             | Multi-stage build. `dev` stage for local hot reload; `runner` stage is the Next.js **standalone** runtime listening on port 80.                                          |
| `docker-compose.yml`     | **Production.** The platform-contract compose: container `hosting_ennie-coffee_web`, network `client_ennie-coffee_net`, `env_file: .env`, capped logs, no Docker labels. |
| `docker-compose.dev.yml` | **Local only.** Bind-mounted source, hot reload, published on `localhost:3000`. Never read by the platform.                                                              |
| `.dockerignore`          | Keeps `.env`, `.git`, `node_modules`, `.next`, and the compose files out of the build context.                                                                           |

`next.config.mjs` sets `output: 'standalone'`, which the Dockerfile relies on.

### Why two compose files

The platform runs the site's `docker-compose.yml` **verbatim**, so that file is production and
nothing else — no published host ports, no bind mounts, no dev-only environment. Local work uses
`docker-compose.dev.yml`, passed explicitly with `-f`.

> ⚠ Do not rename the dev file to `docker-compose.override.yml`. Compose merges an override file
> automatically, and the platform deploys with a plain `docker compose up` in the site directory —
> so an override would apply your local settings in production, and would do it past the security
> validator, which only inspects the base file.

## Local development

```bash
docker compose -f docker-compose.dev.yml up --build
# open http://localhost:3000
```

Edits to the source reload in place; only a dependency change needs `--build` again. Put local
environment variables in `.env.local` (git-ignored) — Next.js reads it from the mounted source.

Before pushing, verify the **production** image the platform will actually build:

```bash
docker compose up --build -d   # builds docker-compose.yml exactly as the platform does
```

That fails locally at the network step (`client_ennie-coffee_net` is created by the platform, not by you). To
check the production image itself, run it directly:

```bash
docker build -t ennie-coffee .
docker run --rm -e NEXT_PUBLIC_SITE_URL=http://localhost -p 8080:80 ennie-coffee
# open http://localhost:8080
```

## Deploy steps

1. **Create the client/site in the panel** with the slug **`ennie-coffee`** (Clients →
   - New Client → set the domain; template _None_ for a repo deploy). The
     container name and network above must match this slug — regenerate with
     `cef generate --client-slug <your-slug>` if it differs.
2. **Container port** must be **80** (the platform default), matching
   the Dockerfile's `EXPOSE 80`.
3. **Environment**: set runtime variables under **Sites → site → Environment**.
   At minimum set `NEXT_PUBLIC_SITE_URL` to the site's public URL (see
   `.env.example`). The panel writes `.env`, which the compose loads via
   `env_file`. Secrets are never baked into the image.
4. **Point the code at the platform**: set the client's GitHub repo + branch and
   **Deploy now**, or push to the configured branch to auto-deploy (webhook).
5. The platform validates the compose (rejecting privileged mode, the Docker
   socket, or foreign networks), builds the image, starts `hosting_ennie-coffee_web` on
   `client_ennie-coffee_net`, and Traefik routes the domain to it — issuing a Let's Encrypt
   certificate on first request in production.

## Review previews

A deploy can be issued as a **review link** instead of going live. The platform generates its own
preview compose from this file's first service, copying only `build`, `image`, `environment`,
`expose` and `command` — so anything the app needs at runtime must arrive through those, and the
site must serve correctly from a single container. The live container keeps serving throughout.
