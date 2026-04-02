# Developer Guide: Param Adventures

This guide outlines the professional workflow for future development, bug fixes, and versioning for Param Adventures Phase 2.

## 1. Tech Stack Baseline
- **Framework**: Next.js 16.2 (App Router)
- **Library**: React 19.0
- **Styling**: Tailwind CSS 4
- **ORM**: Prisma 7.5

## 2. Branching Strategy
| Branch | Purpose | Hosting | Rule |
| :--- | :--- | :--- | :--- |
| `main` | Production (Stable) | AWS (Target) | Never commit directly. Only merge from `release/v*`. |
| `develop` | Integration | Render (Dev) | Standard development base. All features start here. |
| `release/v*` | UAT / Staging | Render (UAT) | Frozen for testing. Only bug fixes allowed. |
| `feature/*` | New Features | Local | Branched from `develop`. |
| `bugfix/*` | UAT Fixes | Local | Branched from `release/v*`. |
| `hotfix/*` | Prod Fixes | Local | Branched from `main`. |

## 3. Standard Development Flow

### Step 1: Start a Task
Always start from the latest `develop` code.
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
```

### Step 2: Local Development & Quality
- **Husky**: Your code is auto-linted on every commit. If it fails, fix the errors before committing.
- **Linting**: Run `npm run lint` frequently.
- **Tests**: Run `npm test -- --run` locally to check your changes.

### Step 3: Integration
1. Push your branch: `git push -u origin feature/my-new-feature`.
2. Open a **Pull Request (PR)** into `develop`.
3. Wait for the **GitHub Actions** (Lint & Test) to turn green.
4. Merge into `develop`.

---

## 4. The UAT & Release Cycle

### Phase A: Candidate Preparation
When `develop` is ready for a major update:
1. Create a release branch: `git checkout -b release/v1.0.0 develop`.
2. Push to GitHub: `git push -u origin release/v1.0.0`.
3. Inform the testing team to use the **Staging Instance** (Render connected to this branch).

### Phase B: UAT Bug Fixing (Fix-and-Merge Protocol)
As testers find bugs on the `release/v1.0.0` branch:
1. **Branch**: `git checkout -b bugfix/issue-name release/v1.0.0`.
2. **Fix**: Implement the fix and verify locally.
3. **Merge**: PR back into `release/v1.0.0` (for immediate UAT re-testing).
4. **Sync**: Periodically merge `release/v1.0.0` back into `develop` to keep the integration branch updated.

### Phase C: Final Production Release
Once UAT is approved:
1. Merge `release/v1.0.0` into `main`.
2. **Tag the release**: 
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release Version 1.0.0"
   git push origin v1.0.0
   ```
3. Final Sync: Merge `main` back into `develop`.

---

## 5. Modular Development Pattern (Admin)
When adding new settings to the Command Center:
- **Location**: Create a new tab component in `src/components/admin/settings/`.
- **Props**: Use the `TabProps` interface for consistent data handling.
- **State**: Use parent-controlled state via `getVal` and `updateSetting` to ensure cross-tab consistency.

## 6. Versioning (SemVer)
- **1.0.0** (Major): Breaking changes or massive new features.
- **0.1.0** (Minor): New features, no breaking changes.
- **0.0.1** (Patch): Bug fixes.
