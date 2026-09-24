# syntax=docker/dockerfile:1.7
#
# Ennie Coffee — one image, four stages.
#   deps     npm ci from the committed lockfile (reproducible)
#   dev      local hot-reload stage, used only by docker-compose.dev.yml
#   builder  next build (standalone output)
#   runner   minimal non-root runtime on port 3000 — the default, last stage the platform builds
#
# The runtime is a single Node process. Everything the site stores — the menu, the administrator
# accounts, the sessions, the audit log and the uploaded imagery — lives under /app/data, which
# production mounts as a Docker volume. There is no database container to start, wait for, or
# back up separately.
#
# Node 24 is the active LTS line (Node 20 reached end of life in April 2026).
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Local development only — targeted by docker-compose.dev.yml, never by the platform. Docker builds
# a stage only when the target depends on it, and "runner" does not depend on this one.
FROM base AS dev
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/app/data
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
# 3000, matching the other sites on the Klivo platform. This has to equal the panel's
# "container port" for that site, because that is the port Traefik dials — a mismatch is a 502
# with nothing in any log but the platform's own "site unavailable" page.
#
# It is an env var rather than a constant on purpose: the Next standalone server reads PORT at
# startup and the health check below follows it, so pointing this container at a different port
# is one line in the panel's Environment, not a rebuild.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Where every mutable byte goes. Mount a volume here (docker-compose.yml does) or the owner's
# edits and uploads are lost the next time the image is replaced.
ENV DATA_DIR=/app/data

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# The standalone server and exactly what it needs at runtime: static assets, public files, and the
# menu photographs, which the first start processes into the media store.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/assets/menu ./assets/menu

# Both directories must exist and belong to the app user before it drops privileges:
#  - /app/data is the data store. Creating it in the image is also what lets Docker populate a
#    fresh named volume with the right ownership on first mount, and what lets the container run
#    at all with no volume attached (a review preview), where it simply seeds itself and serves.
#  - .next/cache is the image optimizer's scratch space, disposable and per-instance.
RUN mkdir -p /app/data /app/.next/cache && chown -R nextjs:nodejs /app/data /app/.next/cache

# The server never runs as root: a remote code execution bug in any dependency stays an isolated
# fault instead of becoming a container takeover.
USER nextjs
EXPOSE 3000

# The health check asks for readiness, which answers only once the server is serving. It is
# deliberately not the home page: a rendering error should show up in the logs as an error page,
# not silently flap the container. The long start period covers the very first start on a fresh
# volume, where the six menu photographs are encoded into their responsive variants.
#
# ${PORT} is expanded by the shell at runtime, so overriding PORT moves the server and its check
# together and they can never end up pointed at different ports.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/api/health/ready" || exit 1

CMD ["node", "server.js"]
