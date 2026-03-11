# Param Adventures (V2)

Param Adventures is a mobile-first, full-stack experiential events platform. It organizes, markets, and manages real-world experiences—including treks, corporate outings, and city walks—through a single digital platform.

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** Custom JWT + RBAC (Role-Based Access Control)
- **Styling:** Tailwind CSS 4 (Saffron & Obsidian Design System)
- **Payments:** Razorpay
- **Media Storage:** AWS S3 & Cloudinary
- **Emails:** Resend & React Email
- **Validation:** Zod (Strict API Input Validation)
- **Security:** Content Sanitization (XSS protection), Security Headers (CSP, X-Frame-Options), and Idempotent transactions.

## 📂 Project Structure

```text
├── docs/                 # Product requirements and technical documentation
├── prisma/               # Database schema and seed scripts
├── src/
│   ├── app/              # Next.js App Router (Public, Dashboard, Admin)
│   ├── components/       # Reusable UI components (Emails, Forms, Views)
│   ├── lib/              # Core utilities (auth, db, payments, email, s3)
│   └── middleware.ts     # Edge middleware for RBAC routing
```

## 🚀 Getting Started

### 1. Environment Variables

Create a `.env` file referencing `.env.example`. You will need PostgreSQL credentials, JWT secret, Razorpay keys, Resend API key, Cloudinary keys, and AWS S3 credentials.

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Database & Seeding

Ensure you seed the database to generate the 6 required Roles and 26 Permissions necessary for the app to function.

```bash
npx prisma migrate deploy
npx prisma db seed
```

> **📘 For full deployment instructions**, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🔐 Roles & Access Control

The application is governed by a strict Role-Based Access Control (RBAC) system. The seed script creates the following base roles:

| Role              | Permissions | Description                                     |
| ----------------- | :---------: | ----------------------------------------------- |
| `SUPER_ADMIN`     |     26      | Full system access including config and audit    |
| `ADMIN`           |     17      | Day-to-day platform management                   |
| `TRIP_MANAGER`    |      5      | Trip operations and Trek Lead assignments        |
| `TREK_LEAD`       |      6      | Ground operations via mobile trip interface      |
| `MEDIA_UPLOADER`  |      4      | Experience drafts and S3 media uploads           |
| `REGISTERED_USER` |      4      | Default role — browse, book, blog                |

> **Documentation:** Please refer to the `/docs` folder for an in-depth reading of the PRD, the architecture, and the database schema.
