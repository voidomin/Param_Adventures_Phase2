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

Create a `.env` file referencing `.env.example`. You will need PostgreSQL credentials, a secret key, Razorpay keys, Resend keys, and Cloudinary keys.

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Database & Seeding

Ensure you seed the database to generate the 7 required Roles and 25 Permissions necessary for the app to function.

```bash
npx prisma db push
npx prisma generate
npm run seed
```

## 🔐 Roles & Access Control

The application is governed by a strict Role-Based Access Control (RBAC) system. The seed script creates the following base roles:

- `SUPER_ADMIN`, `ADMIN` (Full dashboard access)
- `TRIP_MANAGER` (Approves completed treks and handles scheduling)
- `TREK_LEAD` (Manages D-Day operations via the mobile trip interface)
- `BLOGGER` (Writes content that requires admin approval)
- `UPLOADER` (Restricted access to the S3 Media upload endpoints)
- `REGISTERED_USER` (Default public user role)

> **Documentation:** Please refer to the `/docs` folder for an in-depth reading of the PRD, the architecture, and the database schema.
