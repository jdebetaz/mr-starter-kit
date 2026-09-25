<critical>
- Use PNPM workspaces and keep `pnpm-lock.yaml` synchronized with dependency changes.
- Use Oxlint and Oxfmt as the only linting and formatting tools; their root config files own code style.
- Treat `apps/web/.adonisjs/` and `apps/web/types/db.ts` as generated code.
- Organize `apps/web/app` by business capability, not technical layer. Point delivery dependencies from controllers and routes to actions, queries, repositories, and domain objects, never the reverse.
</critical>

## Architecture

Architecture: read [the application architecture](docs/architecture/application.md) before adding or refactoring controllers, Actions, Queries, repositories, domain objects, jobs, or capability boundaries.

Domain language: read [the glossary](CONTEXT.md) before naming or changing domain concepts.

Use Kysely with Postgres for persistence. Keep database invariants in migrations and persistence mapping inside repositories. Prefer explicit read models for non-trivial reads and domain objects for command paths that enforce business rules.

## Design system

Read [the design system guide](docs/agents/design-system.md) before changing `packages/design-system` or extracting UI from an Inertia page.

## Verification

Run `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` before committing. Use Conventional Commits.
