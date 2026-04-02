# Contributing

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** (corepack recommended: `corepack enable`)
- **PostgreSQL** 16 running locally (or via Docker)
- Copy `.env.example` → `.env` and fill in values

## Setup

```bash
pnpm install
pnpm db:generate     # Generate Drizzle migrations
pnpm db:migrate      # Apply migrations
pnpm db:seed         # Seed initial data
pnpm dev             # Start dev server on http://localhost:4321
```

## Scripts

| Command | Purpose |
| ------- | ------- |
| `pnpm dev` | Start Astro dev server |
| `pnpm build` | Production build |
| `pnpm check` | Run `astro check` (TypeScript) |
| `pnpm lint` | ESLint check |
| `pnpm lint:fix` | ESLint auto-fix |
| `pnpm test` | Run Vitest (unit + integration) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed database |
| `pnpm db:reset` | Drop & recreate all tables |

## Project Structure

```md
src/
├── actions/       # Astro actions (server mutations)
├── components/    # Atomic design: atoms → molecules → organisms → pages
├── database/      # Drizzle ORM schemas, loaders, migrations, commands
├── i18n/          # 4 locales (fr, en, es, ar) — config + translation files
├── layouts/       # BaseLayout.astro
├── lib/           # Auth, rate-limit, sanitize, types
├── media/         # Upload/delete logic
├── pages/         # Astro pages and API routes
├── smtp/          # Multi-provider email (Brevo, Resend, Nodemailer)
└── styles/        # Global CSS + design tokens
tests/
├── unit/          # Vitest unit tests
├── integration/   # Vitest integration tests (requires PostgreSQL)
├── e2e/           # Playwright end-to-end tests
├── a11y/          # Lighthouse CI + Pa11y accessibility tests
└── helpers/       # Shared test utilities
```

## Conventions

### Code Style

- ESLint flat config (`eslint.config.js`) — run `pnpm lint` before committing
- TypeScript strict mode — run `pnpm check` for type errors
- Use **Zod** for all runtime validation (actions, API routes)
- Use **DOMPurify** (`src/lib/sanitize.ts`) for any user-generated HTML

### i18n

- 4 locales: `fr` (default), `en`, `es`, `ar` (RTL)
- All translation keys must exist in every locale — the CI cross-locale test enforces this
- Translation files: `src/i18n/{locale}/common.ts`, `home.ts`, `about.ts`, `contact.ts`, `auth.ts`
- Legal content is CMS-driven (database tables `pages` + `page_sections`, template `legal`)
- Use `satisfies` TypeScript pattern to ensure type safety

### Database

- Drizzle ORM with PostgreSQL — schemas in `src/database/schemas/`
- Always use parameterized queries (Drizzle handles this)
- Migrations: `pnpm db:generate` then `pnpm db:migrate`
- Cache layer: `src/database/cache.ts` wraps loaders with in-memory TTL cache

### Testing

- **Unit tests**: Pure logic, mocked dependencies, fast — `tests/unit/`
- **Integration tests**: Real PostgreSQL required — `tests/integration/`
- **E2E tests**: Playwright against running app — `tests/e2e/`
- Run `pnpm test` to execute unit + integration suites
- All new features should include tests
- Minimum coverage: **70% statements/lines**, **65% branches/functions** (enforced by CI)
- Cross-locale key parity is verified automatically

### Security

- CSP strict (defined in `astro.config.mjs`)
- Rate limiting on all public API endpoints (`src/lib/rate-limit.ts`)
- HTML sanitization with DOMPurify (strict allowlist, no `data-*` attributes)
- SVG uploads served as `Content-Disposition: attachment`
- No secrets in `.env.example` — use placeholder values only

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes, add tests
3. Run `pnpm lint && pnpm check && pnpm test`
4. Open PR with a clear description
5. CI must pass (lint, unit+integration, E2E, a11y)
