<critical>
- Use PNPM workspaces and keep `pnpm-lock.yaml` synchronized with dependency changes.
- Use Oxlint and Oxfmt as the only linting and formatting tools; their root config files own code style.
- Treat `apps/web/.adonisjs/` and `apps/web/database/schema.ts` as generated code.
- Organize `apps/web/app` and `apps/web/src` by business capability, not technical layer. `app/<capability>` owns HTTP and Inertia delivery (routes, controllers, validators, middleware, policies, transformers); `src/<capability>` owns actions, queries, repositories, models, domain objects and services. Point delivery dependencies at `src`, never the reverse — `src/**` importing `app/**` or `inertia/**` fails `pnpm lint`.
</critical>

## Architecture

Architecture: read [the application architecture](docs/architecture/application.md) before adding or refactoring controllers, Actions, Queries, repositories, domain objects, jobs, or capability boundaries.

Domain language: read [the glossary](CONTEXT.md) before naming or changing domain concepts.

Observability: read [the observability guide](docs/architecture/observability.md) before changing `apps/web/otel.ts`, `apps/web/config/otel.ts`, or the imports at the top of any entrypoint — `apps/web/bin/server.ts` today — but never `apps/web/bin/console.ts`, where the loader hook breaks Ace's command discovery. OpenTelemetry auto-instrumentation breaks silently when `../otel.js` stops being the first import, and every new entrypoint inherits the rule.

Use Lucid ORM with Postgres for persistence. Keep database invariants in migrations and persistence mapping inside repositories. Prefer explicit read models for non-trivial reads and domain objects for command paths that enforce business rules.

## Design system

Read [the design system guide](docs/agents/design-system.md) before changing `packages/design-system` or extracting UI from an Inertia page.

## Email

Read [the mail guide](docs/architecture/mail.md) before adding or changing a message, an MJML template, or the mail configuration. Install AdonisJS packages with `node ace add <package>`: the codemod owns `config/<name>.ts`, the provider registration and the env block, and overwrites a hand-written setup.

## Background jobs

Read [the queue guide](docs/architecture/queue.md) before adding or changing a job, the retry policy, or the scheduler. Jobs live in `src/<capability>/jobs/`, not the `app/jobs/` that `node ace make:job` defaults to.

## Teams and workspaces

Read [the teams guide](docs/architecture/teams.md) before changing team membership, roles, invitations, or anything that authorizes an action. Authorization and entitlement questions take a `Workspace`, never a `User`.

## Verification

Run `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` before committing. Run `pnpm test:lint` as well when changing `tools/oxlint` or `oxlint.config.ts`. Custom lint rules live under the `tenkai/` namespace; see [the lint rules guide](tools/oxlint/README.md) before disabling one. Use Conventional Commits.
