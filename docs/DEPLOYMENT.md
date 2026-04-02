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
7. [Troubleshooting](#troubleshooting)

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

```bash
# ══════════════════════════════════════════
# CORE & DATABASE
# ══════════════════════════════════════════
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/db_name?sslmode=require"
NEXT_PUBLIC_APP_URL="https://your-app.onrender.com"
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

1. **New Web Service**: Connect your GitHub repository.
2. **Build Selection**: Select **Node** as the environment.
3. **Build Command**: `npm install && npx prisma generate && npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**: Add all variables from the list above.
6. **Health Check Path**: `/api/health` (Optional, ensure route exists).

---

## Option B: AWS (Production Target)

1. **App Runner**: Connect the repository to AWS App Runner for automated builds.
2. **Runtime**: Node.js 22.
3. **Build Command**: Same as Render.
4. **Database**: Provision an **Amazon RDS (PostgreSQL)** instance. Ensure VPC peering or Public Access (if necessary) is configured.

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
