# syntax=docker/dockerfile:1.7
#
# Ennie Coffee — one image, four stages.
#   deps     npm ci from the committed lockfile (reproducible)
#   dev      local hot-reload stage, used only by docker-compose.dev.yml
#   builder  next build (standalone output)
#   runner   minimal non-root runtime on port 80 — the default, last stage the platform builds
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
ENV PORT=80
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# The standalone server and exactly what it needs at runtime: static assets, public files, the SQL
# migrations applied at boot, and the menu photographs processed into the media store on first run.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/assets/menu ./assets/menu
# The image optimizer's cache is disposable per instance; it only needs to be writable.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache

USER nextjs
EXPOSE 80
# Liveness only; the load balancer polls /api/health/ready for membership.
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/api/health/live || exit 1
CMD ["node", "server.js"]
