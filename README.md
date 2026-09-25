# MR Starter Kit

A modern monorepo starter kit configured with best practices for JavaScript/TypeScript development.

## Features

- 📦 **pnpm Workspaces** - Efficient package management with pnpm monorepo support
- 🔧 **OXLint** - Code linting
- 💅 **OXFmt** - Consistent code formatting
- 🐶 **Husky** - Git hooks for automated quality checks
- 📝 **Commitlint** - Enforce [Conventional Commits](https://www.conventionalcommits.org/) specification
- 🚀 **lint-staged** - Run linters on staged files only

## Requirements

- Node.js (managed via [Mise](https://mise.jdx.dev/), see `mise.toml`)
- pnpm (managed via [Mise](https://mise.jdx.dev/), see `mise.toml`)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mr-starter-kit

# Personalize the project
pnpm scaffold

# Install dependencies
pnpm install
```

`pnpm scaffold` asks for the project name, slug, description, author, repository URL, and license, then rewrites `package.json`, `README.md`, and `CONTEXT.md` in place, personalizes the release commands, and enables the release workflow, which stays disabled while the starter kit itself is in use. Every answer is optional: press Enter to keep the current value.

### Project Structure

```
mr-starter-kit/
├── apps/               # Application packages
├── packages/           # Shared packages/libraries
├── docs/               # Documentation
├── .husky/             # Git hooks configuration
├── oxfmt.config.ts     # OXFmt configuration
├── oxlint.config.ts    # OXLint configuration
├── .lintstagedrc.json  # lint-staged configuration
└── pnpm-workspace.yaml # pnpm workspace configuration
```

## Development

### Adding a New Package

Create a new directory in either `apps/` or `packages/`:

```bash
# For applications
mkdir apps/my-app
cd apps/my-app
pnpm init

# For shared libraries
mkdir packages/my-lib
cd packages/my-lib
pnpm init
```

### Code Quality

This project enforces code quality through automated git hooks:

- **Pre-commit**: Runs OXLint and OXFmt on staged files
- **Commit-msg**: Validates commit messages against Conventional Commits

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Commit messages should be structured as:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
