# 🚀 Param Adventures — Deployment Guide

This guide walks you through deploying Param Adventures to a production environment (AWS or any cloud provider).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup (PostgreSQL)](#database-setup-postgresql)
4. [Build & Deploy](#build--deploy)
5. [Post-Deploy Verification](#post-deploy-verification)
6. [Common Deployment Commands](#common-deployment-commands)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement        | Details                                           |
| ------------------ | ------------------------------------------------- |
| **Node.js**        | v20+ recommended (tested on v22)                  |
| **PostgreSQL**     | v14+ (AWS RDS, Supabase, Neon, or self-hosted)    |
| **npm**            | v10+                                              |
| **Domain (optional)** | For production HTTPS                           |

### Third-Party Accounts Required

- **Razorpay** — Payment gateway ([razorpay.com](https://razorpay.com))
- **Cloudinary** — Image/video storage ([cloudinary.com](https://cloudinary.com))
- **AWS S3** — Media library storage ([aws.amazon.com/s3](https://aws.amazon.com/s3))
- **Resend** — Transactional emails ([resend.com](https://resend.com))

---

## Environment Variables

Create a `.env` file in the project root with the following variables. **All variables are required** unless marked optional.

```bash
# ══════════════════════════════════════════
# DATABASE
# ══════════════════════════════════════════
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/param_adventure?schema=public"

# ══════════════════════════════════════════
# JWT AUTHENTICATION
# ══════════════════════════════════════════
JWT_SECRET=<a-strong-random-string-at-least-32-chars>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# ══════════════════════════════════════════
# PAYMENT GATEWAY (Razorpay)
# ══════════════════════════════════════════
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx   # Same as RAZORPAY_KEY_ID (exposed to client for checkout)

# ══════════════════════════════════════════
# EMAIL (Resend)
# ══════════════════════════════════════════
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# ══════════════════════════════════════════
# MEDIA — AWS S3 (Media Library)
# ══════════════════════════════════════════
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET_NAME=param-adventure-media

# ══════════════════════════════════════════
# MEDIA — Cloudinary (Payment Proofs, Avatars)
# ══════════════════════════════════════════
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx

# ══════════════════════════════════════════
# SUPER ADMIN BOOTSTRAP (for seed script)
# ══════════════════════════════════════════
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>

# ══════════════════════════════════════════
# APP URL (used in emails, sitemap, SEO)
# ══════════════════════════════════════════
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

> **⚠️ Security Notes:**
> - Use a unique, random `JWT_SECRET` (not the dev fallback).
> - Never commit `.env` to version control.
> - Use live Razorpay keys (`rzp_live_`), not test keys (`rzp_test_`).

---

## Database Setup (PostgreSQL)

### Step 1: Create the Database

On AWS RDS (or your provider), create a PostgreSQL database named `param_adventure`. Update `DATABASE_URL` accordingly.

### Step 2: Apply Migrations

```bash
npx prisma migrate deploy
```

This creates all tables. **This command is non-destructive** — it only applies pending migrations and never drops existing data.

### Step 3: Seed Roles, Permissions & Admin

```bash
npx prisma db seed
```

This runs `prisma/seed.mjs` and creates:

| What                    | Count | Details                                      |
| ----------------------- | :---: | -------------------------------------------- |
| **Categories**          |   6   | Trekking, Camping, Spiritual, etc.           |
| **Roles**               |   6   | SUPER_ADMIN, ADMIN, TRIP_MANAGER, etc.       |
| **Permissions**         |  26   | trip:browse, booking:create, user:view-all…  |
| **Role ↔ Permission**   |  62   | Full RBAC matrix linking roles to permissions|
| **Super Admin User**    |   1   | Created using ADMIN_EMAIL / ADMIN_PASSWORD   |

The seed is **idempotent** (uses `upsert`) — safe to run multiple times without data duplication.

---

## Build & Deploy

### Option A: Standard Node.js Server (EC2 / VPS)

```bash
# 1. Install dependencies
npm ci --production=false

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply migrations
npx prisma migrate deploy

# 4. Seed the database (first deploy only, safe to rerun)
npx prisma db seed

# 5. Build the application
npm run build

# 6. Start the production server
npm start
```

Use a process manager like **PM2** to keep the server running:

```bash
pm2 start npm --name "param-adventure" -- start
pm2 save
pm2 startup
```

### Option B: Docker (ECS / Fargate)

Create a multi-stage Dockerfile:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

> **Note:** Run `prisma migrate deploy` and `prisma db seed` as a separate init container or CI/CD step, not inside the web server container.

---

## Post-Deploy Verification

After deployment, run through this checklist:

| #  | Check                                  | How                                                         |
|----|----------------------------------------|-------------------------------------------------------------|
| 1  | App loads                              | Visit `https://yourdomain.com`                              |
| 2  | Super Admin login                      | Log in at `/login` with ADMIN_EMAIL / ADMIN_PASSWORD        |
| 3  | Admin sidebar fully visible            | Navigate to `/admin` — should see all 12 sidebar items      |
| 4  | Categories exist                       | Check `/admin/categories` — 6 default categories            |
| 5  | New user registration                  | Register a new account — should get REGISTERED_USER role    |
| 6  | Razorpay checkout                      | Start a booking — Razorpay modal should open                |
| 7  | Emails working                         | Register → should receive welcome email                     |
| 8  | Media upload                           | Upload an image in `/admin/media`                           |
| 9  | Hero slides                            | If no DB slides, fallback images will display (expected)    |

---

## Common Deployment Commands

```bash
# Apply new schema changes (safe, non-destructive)
npx prisma migrate deploy

# Re-seed roles/permissions (idempotent, safe to rerun)
npx prisma db seed

# Open database GUI (dev only, not for production)
npx prisma studio

# Check build locally before deploying
npm run build

# View production logs (if using PM2)
pm2 logs param-adventure
```

---

## Troubleshooting

### "Cannot connect to database"
- Verify `DATABASE_URL` is correct and the database server allows connections from your server's IP.
- On AWS RDS, check the **Security Group** allows inbound connections on port `5432`.

### "Seed script fails"
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
