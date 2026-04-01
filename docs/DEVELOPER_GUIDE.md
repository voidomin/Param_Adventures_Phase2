# Developer Guide: Param Adventures

This guide outlines the professional workflow for future development, bug fixes, and versioning.

## 1. Branching Strategy
| Branch | Purpose | Rule |
| :--- | :--- | :--- |
| `main` | Production (Stable) | Never commit directly. Only merge from `release/v*`. |
| `develop` | Integration (Bleeding Edge) | Standard development base. All features start here. |
| `release/v*` | UAT / Release Candidate | Frozen for testing. Only bug fixes allowed. |
| `feature/*` | New Implementations | Branched from `develop`. |
| `bugfix/*` | UAT Fixes | Branched from `release/v*`. |
| `hotfix/*` | Production Fixes | Branched from `main`. |

## 2. Standard Development Flow

### Step 1: Start a Task
Always start from the latest `develop` code.
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature
```

### Step 2: Local Development & Quality
- **Husky**: Your code is auto-linted on every commit. If it fails, fix the errors before committing.
- **Fast Tests**: Run `npm run test:fast` locally to check your changes.

### Step 3: Integration
1. Push your branch: `git push -u origin feature/my-new-feature`.
2. Open a **Pull Request (PR)** from your branch into `develop`.
3. Wait for the **GitHub Actions** (Lint & Test) to turn green.
4. Merge into `develop`.

---

## 3. The Release Cycle (V1.0 and beyond)

### Phase A: Candidate Preparation
When `develop` is ready for a major update:
1. Create a release branch: `git checkout -b release/v1.0.0 develop`.
2. Push to GitHub: `git push -u origin release/v1.0.0`.
3. Inform the testing team to use the **Staging Instance** (connected to this branch).

### Phase B: UAT & Bug Fixing
As the 10 testers find bugs:
1. Create a fix branch: `git checkout -b bugfix/login-error release/v1.0.0`.
2. Fix the bug and PR back into `release/v1.0.0`.

### Phase C: Final Release
Once the team approves:
1. Merge `release/v1.0.0` into `main`.
2. **Tag the release**: 
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release Version 1.0.0"
   git push origin v1.0.0
   ```
3. Merge `main` back into `develop` to keep them synchronized.

---

## 4. Versioning (SemVer)
- **1.0.0** (Major): Breaking changes or massive new features.
- **0.1.0** (Minor): New features, no breaking changes.
- **0.0.1** (Patch): Bug fixes.
