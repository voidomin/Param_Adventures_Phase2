# 🚀 Param Adventures — Deployment Guide

This guide walks you through deploying Param Adventures to a production or staging environment. The platform currently supports **Render** (Primary Staging/UAT) and **AWS** (Production Target).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Deployment Options](#deployment-options)
   - [Option A: Render (Recommended for Staging/UAT)](#option-a-render)
   - [Option B: AWS (Production)](#option-b-aws)
4. [Sentry Monitoring Setup](#sentry-monitoring-setup)
5. [Database Setup (PostgreSQL)](#database-setup-postgresql)
6. [Post-Deploy Verification](#post-deploy-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Backup & Restore](#backup--restore)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement        | Details                                           |
| ------------------ | :------------------------------------------------ |
| **Node.js**        | v20+ recommended (tested on v22)                  |
| **PostgreSQL**     | v14+ (Render DB, AWS RDS, or self-hosted)         |
| **npm**            | v10+                                              |
| **Sentry DSN**     | For real-time error tracking                      |

### Third-Party Accounts Required

- **Razorpay** — Payment gateway ([razorpay.com](https://razorpay.com))
- **Cloudinary** — Image/video storage ([cloudinary.com](https://cloudinary.com))
- **AWS S3** — Media library storage ([aws.amazon.com/s3](https://aws.amazon.com/s3))
- **Resend** — Transactional emails ([resend.com](https://resend.com))
- **Zoho** — Domain email & API delivery ([zoho.com/mail](https://zoho.com/mail))

---

## Environment Variables

Create your environment variables in the Render/AWS dashboard. **All variables are required** for full system functionality.

> **`NEXT_PUBLIC_APP_URL` must always be the real custom domain (`https://paramadventures.in`), never the hosting platform's free default subdomain (e.g. Render's `*.onrender.com`).** This value seeds the `app_url` platform setting on first boot, and that setting drives `sitemap.xml`, `robots.txt`, and every page's canonical/Open Graph URL — if it's ever set to the onrender.com URL, the site starts telling search engines that URL is canonical, which causes real duplicate-content indexing. The seed only runs once, so if this was ever set wrong, fix it via **Admin → Settings → System → App URL** (not just the env var) after correcting it here.

```bash
# ══════════════════════════════════════════
# CORE & DATABASE
# ══════════════════════════════════════════
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/db_name?sslmode=require"
NEXT_PUBLIC_APP_URL="https://paramadventures.in"
NODE_ENV="production"

# ══════════════════════════════════════════
# AUTHENTICATION
# ══════════════════════════════════════════
JWT_SECRET="a-strong-random-string-at-least-32-chars"
JWT_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"

# ══════════════════════════════════════════
# MONITORING (Sentry)
# ══════════════════════════════════════════
SENTRY_DSN="https://xxxx@xxxx.ingest.sentry.io/xxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxx@xxxx.ingest.sentry.io/xxxx"

# ══════════════════════════════════════════
# PAYMENTS (Razorpay)
# ══════════════════════════════════════════
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"

# ══════════════════════════════════════════
# EMAILS (Dual Provider)
# ══════════════════════════════════════════
EMAIL_PROVIDER="RESEND" # Options: RESEND | ZOHO_API | ZOHO_SMTP
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
ZOHO_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"
SMTP_USER="booking@yourdomain.com"
SMTP_PASS="xxxxxxxx"

# ══════════════════════════════════════════
# MEDIA (AWS S3 & Cloudinary)
# ══════════════════════════════════════════
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="AKIAxxxxxxxxxxxxxxxx"
AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"
AWS_S3_BUCKET_NAME="param-adventure-media"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="xxxxxxxxxxxx"
CLOUDINARY_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxx"

# ══════════════════════════════════════════
# BOOTSTRAP (Admin Seed)
# ══════════════════════════════════════════
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="a-strong-password"
FORCE_SEED="true" # Set to true only for the first deployment
```

---

## Option A: Render (Recommended)

Render is used for current UAT and Staging environments.

**`render.yaml`** at the repo root is a version-controlled Render Blueprint — Render auto-detects it on **New Web Service → Connect a repository**, which pre-fills the build/start commands and health check path below. Only step 5 (secrets) has to be entered by hand in the dashboard; everything else comes from the file, so staging config doesn't silently drift from what's committed.

1. **New Web Service**: Connect your GitHub repository — Render should detect `render.yaml` automatically.
2. **Build Selection**: Select **Node** as the environment.
3. **Build Command**: `npm install && npx prisma generate && npm run build` (from `render.yaml`).
4. **Start Command**: `npm start` (from `render.yaml`).
5. **Environment Variables**: Add all variables from the list above — these are secrets and are intentionally *not* in `render.yaml`.
6. **Health Check Path**: `/api/health` (from `render.yaml`).
7. **Custom Domain**: once you attach `paramadventures.in` as a custom domain in the Render dashboard, the app's default `*.onrender.com` URL keeps working and keeps serving the exact same app — Render does not disable or redirect it for you. The middleware redirects any request to `*.onrender.com` to the custom domain (see `src/proxy.ts`), but that only helps if `NEXT_PUBLIC_APP_URL`/the `app_url` setting is also correct (see the callout above) — otherwise the site's own canonical tags and sitemap will still point at the onrender.com host.

---

## Option B: AWS (Production Target)

**`apprunner.yaml`** at the repo root is the version-controlled App Runner config file, mirroring `render.yaml`'s role for the Render side — App Runner reads it automatically when the source repository is connected, so production's build/run commands live in git instead of only in the AWS console.

1. **App Runner**: Connect the repository to AWS App Runner — it will pick up `apprunner.yaml` automatically for build/run configuration.
2. **Runtime**: Node.js 22 (from `apprunner.yaml`).
3. **Build Command**: Same as Render (from `apprunner.yaml`).
4. **Database**: Provision an **Amazon RDS (PostgreSQL)** instance. Ensure VPC peering or Public Access (if necessary) is configured.
5. **Environment Variables**: Add all variables from the list above via the App Runner console — same secrets-stay-out-of-git approach as Render.

---

## Sentry Monitoring Setup

1. Create a new project in your [Sentry Dashboard](https://sentry.io/).
2. Select **Next.js** as the platform.
3. Copy the `SENTRY_DSN` and add it to your environment variables.
4. The application is pre-configured with `@sentry/nextjs`. Errors will be captured automatically on both client and server sides.

---

## Database Setup

### Step 1: Apply Migrations
Always run this command first to ensure the schema is up to date.
```bash
npx prisma migrate deploy
```

### Step 2: Seed the Database
Crucial for creating the **6 Roles** and **26 Permissions** needed for the Command Center.
```bash
npx prisma db seed
```

---

## Post-Deploy Verification

| # | Check             | Expected Result                                |
|---|-------------------|------------------------------------------------|
| 1 | App Loads         | Landing page is visible.                       |
| 2 | Admin Login       | Can access `/admin` with `ADMIN_EMAIL`.         |
| 3 | Command Center    | All tabs (Finance, Security, etc.) are visible. |
| 4 | Razorpay Modal    | Opens successfully on experience checkout.     |
| 5 | Sentry Check      | Visit `/api/debug-sentry` to trigger a test error.|

---

## Rollback Procedure

If a deploy goes out and something's broken, don't try to hot-fix forward under pressure — roll back first, then fix calmly.

### Render (staging/UAT)

1. Open the service in the Render dashboard → **Events** tab.
2. Find the last known-good deploy (the one before the broken one).
3. Click **⋮** → **Redeploy** on that commit. Render rebuilds and serves it — no code changes needed on your end.
4. Alternatively, from the **Deploys** tab, click into any prior successful deploy and use **Rollback to this deploy** if shown for your plan tier.

### AWS App Runner (production)

1. Open the App Runner service → **Deployments** tab.
2. If the previous deployment is still listed, use **Deploy** against that prior image/commit to redeploy it.
3. If App Runner is tracking a Git branch directly: `git revert <bad-commit-sha>` and push — this is the reliable path since App Runner doesn't have a one-click "previous deploy" button the way Render does.

### Database migrations

**Rolling back code does NOT roll back a migration that already ran.** If the broken deploy included a schema migration:

1. Check whether the migration is additive-only (new nullable columns/tables) — if so, rolling back the code is enough; the extra columns are harmless and can be cleaned up later in a follow-up migration.
2. If the migration was destructive (dropped/renamed a column, changed a type) and the rolled-back code expects the old schema, you need a **compensating migration** that reverses it — write and apply a new migration, don't hand-edit migration history.
3. When in doubt, restore from backup instead of trying to hand-reverse a destructive migration under pressure (see Backup & Restore below).

### After rolling back

- Confirm the rollback actually fixed the issue (re-run the Post-Deploy Verification checklist above).
- Don't delete the bad branch/PR — figure out what broke before retrying.

---

## Backup & Restore

Render's paid Postgres plan takes automated daily backups. That fact alone is not a disaster-recovery plan — **a backup that has never been test-restored is an assumption, not a guarantee.** Run this drill periodically (recommended: after any major schema change, and at least once a quarter).

### Restore drill (do this on a throwaway/staging database, never production)

1. In the Render dashboard, open the Postgres instance → **Backups** tab.
2. Pick a recent backup and create a **new, separate** database instance from it (Render supports restoring to a new instance — do not restore over the live database).
3. Point a local `.env` (or a disposable Render preview environment) at the restored instance's connection string.
4. Run `npx prisma migrate status` against it to confirm the schema is intact and migrations are in the expected state.
5. Spot-check a few tables (`User`, `Booking`, `Payment`) for row counts and recent data — confirm the backup is actually usable, not just present.
6. Tear down the throwaway instance once satisfied.
7. Record the date and outcome of the drill (a line in this file or an internal note is enough) so there's a record it was actually tested.

### If a real restore is ever needed

1. **Stop writes first** — put the app in maintenance mode (`maintenance_mode` platform setting) before touching the database, so nothing writes to the old data while you're restoring.
2. Follow the same restore-to-new-instance steps above, but once verified, update `DATABASE_URL` on the web service to point at the restored instance (rather than trying to restore in-place).
3. Run `npx prisma migrate deploy` against the restored instance to catch it up to the current schema if it predates recent migrations.
4. Verify with the Post-Deploy Verification checklist before taking the app out of maintenance mode.

---

## Troubleshooting

### "Database connection error"
- Ensure `?sslmode=require` is added to your `DATABASE_URL` for Render/RDS.
- Check that your IP or the Hosting Provider's IP is allowed in the DB access list.

### "Seed failed"
- Ensure `FORCE_SEED=true` is set if you are seeding on a production-like environment.
- Verify `ADMIN_EMAIL` hasn't already been created.
ls"
- Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`.
- The seed script requires `dotenv`, `bcryptjs`, `@prisma/client`, `@prisma/adapter-pg`, and `pg` — all included in project dependencies.

### "Admin sidebar shows only 2 items"
- The RBAC permissions are missing. Run `npx prisma db seed` to restore all role-permission mappings.
- Log out and back in after seeding to refresh the auth session.

### "Razorpay modal doesn't open"
- Ensure `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set (this is exposed to the browser).
- Use `rzp_live_` keys for production, `rzp_test_` for development.

### "Images not uploading"
- Check `AWS_*` variables for S3 and `CLOUDINARY_*` variables for Cloudinary.
- Ensure the S3 bucket has proper CORS configuration.

### "Emails not sending"
- Verify `RESEND_API_KEY` is valid.
- Check the Resend dashboard for delivery logs.

---

## Important: Migration Safety

| Command                  | Environment    | Drops Data? |
| ------------------------ | -------------- | :---------: |
| `prisma migrate deploy`  | **Production** |     ❌      |
| `prisma migrate dev`     | Dev only       |     ⚠️      |
| `prisma migrate reset`   | Dev only       |     ✅      |

> **Never run `prisma migrate dev` or `prisma migrate reset` against your production database.** These commands can wipe all data. Always use `prisma migrate deploy` in production.
