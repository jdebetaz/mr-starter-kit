---
description: Enforce Angular (Conventional Commits) message format
mode: skill
---

When writing git commit messages, use the Angular commit convention:

- Format: `<type>(<scope>): <short summary>`
- Scope is optional; omit the parentheses if no scope applies.
- Summary uses imperative mood, lowercase, no trailing period.

Allowed types:

- feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert

Examples:

- feat(resume): add gotenberg export flow
- fix(export): handle expired token response
- docs: document tauri and web apps
