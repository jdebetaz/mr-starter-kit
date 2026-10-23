# MR Starter Kit

A modern monorepo starter kit built as a modular AdonisJS monolith with a shared React design system, demonstrating pragmatic DDD architecture, comprehensive identity management, and production-ready observability.

## Features

- **pnpm Workspaces** - Efficient package management with monorepo support
- **AdonisJS 7** - Modern TypeScript web framework (modular monolith)
- **Inertia.js + React 19** - SPA-like experience without client-side routing
- **Ark UI + Tailwind CSS + Tailwind Variants** - Accessible, styled component primitives
- **Lucid ORM + PostgreSQL** - AdonisJS's official ORM with migrations
- **Shared Design System** - Atomic Design components with Storybook
- **Shared Validation** - Reusable password policy and validation rules
- **Identity & Authentication** - Registration, login, TOTP 2FA, recovery codes
- **OpenTelemetry** - Structured logging, metrics, and tracing
- **OXLint + OXFmt** - Fast, unified linting and formatting
- **Husky + lint-staged + Commitlint** - Automated quality gates
- **Japa** - Unit, integration, and browser testing
- **Docker** - Containerized development and deployment

## Architecture

This is a **modular monolith** organized by business capability:

```
mr-starter-kit/
├── apps/
│   └── web/                    # AdonisJS application
│       ├── app/
│       │   ├── core/           # Shared kernel (exceptions, middleware, ORM mixins)
│       │   └── identity/       # Auth capability (actions, controllers, models, policies, queries)
│       ├── inertia/            # React pages, layouts, components
│       ├── config/             # AdonisJS configuration
│       ├── database/           # Migrations & schema
│       ├── providers/          # Service providers
│       ├── start/              # Bootstrapping (routes, env, validator, kernel)
│       └── bin/                # Entry points (server, console, test)
├── packages/
│   ├── design-system/          # Shared React UI library (atoms, molecules, organisms)
│   └── validation/             # Shared validation logic (password policy, etc.)
├── docs/
│   ├── architecture/           # Architecture decision records
│   └── agents/                 # Agent guides for AI-assisted development
├── .husky/                     # Git hooks
├── docker/                     # Docker configuration
├── oxlint.config.ts            # OXLint configuration
├── oxfmt.config.ts             # OXFmt configuration
└── pnpm-workspace.yaml         # pnpm workspace definition
```

### Dependency Direction

```
controllers/routes → Actions/Queries → Repositories → Domain Objects
                         ↓
                   Inertia Pages (React)
```

- **Delivery** (`apps/web/app/*`) owns HTTP, Inertia, validation, policies, repositories
- **Read models** (Queries) return projections; **command models** (Actions) enforce invariants
- **Design system** (`packages/design-system`) flows toward atoms → molecules → organisms
- **Application code never imports from design-system internals**—only public exports

## Requirements

- **Node.js** ≥ 24 (managed via [Mise](https://mise.jdx.dev/), see `mise.toml`)
- **pnpm** ≥ 12 (managed via Mise)
- **Docker** (for PostgreSQL, optional for local development)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mr-starter-kit

# Personalize the project (optional)
pnpm scaffold

# Install dependencies
pnpm install

# Start PostgreSQL (if using Docker)
pnpm docker:up

# Run database migrations
cd apps/web && node ace migration:run

# Start development server
pnpm dev
```

`pnpm scaffold` prompts for project name, slug, description, author, repository URL, and license. It rewrites `package.json`, `README.md`, and `CONTEXT.md`, personalizes release commands, and enables the release workflow (disabled while the starter kit is in use). All answers are optional—press Enter to keep current values.

### Environment Configuration

Copy `.env.example` to `.env` in `apps/web/` and configure:

- `APP_KEY` — Generate with `node ace generate:key`
- `DB_*` — PostgreSQL connection (default: `postgres://postgres:postgres@localhost:5432/boilerplate`)
- `SESSION_DRIVER` — `cookie` or `database`
- `OTEL_*` — OpenTelemetry endpoint (optional)

## Development

### Common Commands

```bash
# Run all type checks
pnpm typecheck

# Run all tests
pnpm test

# Lint & format
pnpm lint
pnpm format
pnpm lint:fix
pnpm format:fix

# AdonisJS commands (from apps/web)
node ace serve --hmr          # Dev server with HMR
node ace build                # Production build
node ace migration:run        # Run migrations
node ace migration:rollback   # Rollback last migration
node ace make:controller      # Generate controller
node ace make:model           # Generate model
node ace make:middleware      # Generate middleware
node ace make:validator       # Generate VineJS validator
node ace make:action          # Generate Action (custom)
node ace make:query           # Generate Query (custom)

# Design system
pnpm --filter @boilerplate/design-system storybook  # Start Storybook
pnpm --filter @boilerplate/design-system build:storybook  # Build static Storybook
```

### Adding a Capability

Create a new business capability under `apps/web/app/`:

```bash
mkdir -p apps/web/app/<capability>/{controllers,models,repositories,queries,actions,transformers,policies,validators}
```

Follow the architecture guide in `docs/architecture/application.md`:

- Organize by capability, not technical layer
- Use Actions for commands, Queries for reads
- Keep controllers thin—`render` for pages, `execute` for mutations
- Define `Result<T, E>` types for expected business outcomes

### Adding a Design System Pattern

1. Search `packages/design-system/src` for existing patterns
2. Classify by Atomic Design: **atom** (primitive), **molecule** (small composition), **organism** (section)
3. Implement with Ark UI + Tailwind Variants in the appropriate folder
4. Add colocated `*.stories.tsx` covering default, variants, and edge cases
5. Export via `packages/design-system/package.json` exports
6. Consume via `@boilerplate/design-system/<pattern>`

See `docs/agents/design-system.md` for the complete workflow.

## Identity Capability (Built-in)

The `identity` capability demonstrates the architecture:

- **Registration** → `RegisterUser` Action → `UserRepository` → `User` entity
- **Login** → `SignIn` Action → session + optional 2FA challenge
- **Two-Factor (TOTP)** → Enrollment, challenge, disable, recovery codes
- **Policies** → Role-based 2FA requirement (`TwoFactorRequirementPolicy`)
- **Queries** → `TwoFactorStatusQuery`, `PendingTotpEnrollmentQuery`

Routes: `/signup`, `/login`, `/account`, `/settings/security`, `/challenge/totp`, `/challenge/recovery`

## Testing

```bash
# Unit & integration tests
pnpm --filter @boilerplate/web test

# Browser tests (requires dev server running)
pnpm --filter @boilerplate/web test:browser

# Design system typecheck
pnpm --filter @boilerplate/design-system typecheck
```

Tests use **Japa** with:

- `@japa/api-client` — HTTP API testing
- `@japa/browser-client` — Playwright-based browser testing
- `@japa/plugin-adonisjs` — AdonisJS integration

## Observability

OpenTelemetry is configured in `apps/web/otel.ts` and `apps/web/config/otel.ts`. The first import in `apps/web/bin/server.ts` **must** be `../otel.js` for auto-instrumentation to work.

Exports:

- **Logs** — Pino with structured JSON
- **Metrics** — Prometheus-compatible
- **Traces** — OTLP HTTP to collector

## Docker

```bash
# Start all services (PostgreSQL, app)
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f web
```

The `Dockerfile` builds the AdonisJS app for production. Development uses the host Node.js with volume mounts.

## Code Quality

Enforced via git hooks (Husky):

- **pre-commit** — OXLint + OXFmt on staged files
- **commit-msg** — Conventional Commits validation

### Conventional Commits

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

## Release

```bash
# Prepare release (updates version, changelog, tags)
pnpm release

# Rewrite release commits after merge (maintainers)
pnpm release:rewrite
```

Release workflow is disabled until `pnpm scaffold` personalizes the project.

## Documentation

- [Application Architecture](docs/architecture/application.md)
- [Observability Guide](docs/architecture/observability.md)
- [Design System Guide](docs/agents/design-system.md)
- [Domain Glossary](CONTEXT.md)
- [Agent Instructions](AGENTS.md)

## License

UNLICENSED — Personalized via `pnpm scaffold`.
