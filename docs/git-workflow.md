# Git Workflow & Release Strategy

This document defines how we manage the codebase, branches, and deployments for **Param Adventure Phase 2**.

## 1. Branching Model

We use a simplified **GitFlow** model to ensure stability while allowing active development.

| Branch      | Purpose                                                                 | Stability          |
| ----------- | ----------------------------------------------------------------------- | ------------------ |
| `main`      | **Production**. Only stable, tested code is merged here.                | Production-Ready   |
| `develop`   | **Integration**. Core branch where all features are merged for testing. | Stable-Development |
| `feature/*` | **New Features**. Individual features (e.g., `feature/admin-crud`).     | Experimental       |
| `hotfix/*`  | **Urgent Fixes**. Branches directly from `main` to fix production bugs. | Critical           |

## 2. Release Cycle

- **Phase 1 (Implementation)**: Weekly merges from `develop` to `main` after verification.
- **Phase 2 (Staging)**: Continuous deployment to an AWS Staging environment from the `develop` branch.
- **Phase 3 (Production)**: Tagged releases on the `main` branch (e.g., `v1.0.0`).

## 3. Commit Standards

We follow the **Conventional Commits** specification to keep the history clean and readable:

- `feat:` A new feature for the user.
- `fix:` A bug fix.
- `chore:` Changes that don't modify src or test files (e.g., updating docs).
- `docs:` Documentation only changes.
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc).

**Example:** `feat: implement role-based access control for admin dashboard`

## 4. Pull Request (PR) Policy

1. No direct commits to `main` or `develop`.
2. All `feature/*` branches must be merged into `develop` via a Pull Request.
3. PRs must include:
   - A summary of changes.
   - Reference to the relevant `docs/` requirement or milestone.
   - Verification results (CLI output or screenshots).
4. Code must pass linting and build checks before merging.
