# ennie-coffee

Ennie Coffee (Ennie Coffee Kávéház) — premium independent coffee shop in Hatvan, Hungary (Kossuth tér 10), open since 2015. Hungarian-language public website with a homepage, an editorial price list (Árlista) of coffees, matcha and chai lattes, milkshakes, fruit smoothies, lemonades and hot chocolates, an about page, and a contact page with map and opening hours; plus a secure admin panel to manage products, prices, categories, images and social links.

Built with nextjs and typescript, scaffolded by the Claude Enterprise
Framework (CEF).

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs on http://localhost:3000.

## Scripts

- `pnpm dev` — start the development server
- `pnpm build` — build for production
- `pnpm start` — run the production build
- `pnpm lint` — lint with ESLint · `pnpm format` — format with Prettier
- `pnpm test` — run the test suite with Vitest
- `pnpm verify` — run every gate in review order (types, lint, format, tests)

## Docker

Two stacks, two files. Local development is explicit; `docker-compose.yml` is production and a
host that deploys this repository runs it verbatim.

```bash
docker compose -f docker-compose.dev.yml up --build   # local: hot reload on :3000
docker compose up --build                             # production stack, as deployed
```

Put local conveniences in `docker-compose.dev.yml` only, and never add a
`docker-compose.override.yml` — Compose merges an override into every bare `docker compose up`,
including the deploy.

## Project structure

This project follows the CEF conventions. See `CLAUDE.md` and `.cef/manifest.yaml` for the
enabled engines and configuration.

## Deployment

Target: **docker**. See `.cef/project.json` for the full configuration.
