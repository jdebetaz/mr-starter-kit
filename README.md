# MR Starter Kit

A modern monorepo starter kit configured with best practices for JavaScript/TypeScript development.

## Features

- 📦 **pnpm Workspaces** - Efficient package management with pnpm monorepo support
- 🔧 **ESLint** - Code linting with [@julr/tooling-configs](https://github.com/Julien-R44/tooling-configs)
- 💅 **Prettier** - Consistent code formatting
- 🐶 **Husky** - Git hooks for automated quality checks
- 📝 **Commitlint** - Enforce [Conventional Commits](https://www.conventionalcommits.org/) specification
- 🚀 **lint-staged** - Run linters on staged files only
- ⚡ **Volta** - Consistent Node.js and pnpm versions across the team

## Requirements

- Node.js 24.12.0 (managed via [Volta](https://volta.sh/))
- pnpm 10.28.0 (managed via Volta)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mr-starter-kit

# Install dependencies
pnpm install
```

### Project Structure

```
mr-starter-kit/
├── apps/              # Application packages
├── packages/          # Shared packages/libraries
├── docs/              # Documentation
├── .husky/            # Git hooks configuration
├── eslint.config.js   # ESLint configuration
├── .prettierrc.js     # Prettier configuration
├── .lintstagedrc.json # lint-staged configuration
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

- **Pre-commit**: Runs ESLint and Prettier on staged files
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

## Configuration

### ESLint

ESLint is configured using `@julr/tooling-configs` with TypeScript support. The configuration includes:

- TypeScript with decorator support
- Perfectionist plugin for import sorting
- Custom rules for AdonisJS patterns

### Prettier

Prettier is configured with the following settings:

- Tab indentation
- Single quotes
- Semicolons
- 120 character print width
- ES5 trailing commas
