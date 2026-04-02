# Param Adventures (V2) 🏔️

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Linting](https://img.shields.io/badge/Lint-100%25%20Clean-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-937%2F937%20Passed-success.svg)]()
[![Framework](https://img.shields.io/badge/Next.js-16.2-black.svg)]()

**Param Adventures** is a mobile-first, full-stack experiential events platform designed to organize, market, and manage high-end real-world experiences—including treks, corporate outings, and city walks—through a unified digital ecosystem.

---

## 🏗️ State-of-the-Art Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router & Turbopack) |
| **Library** | [React 19](https://react.dev/) (Concurrent Mode) |
| **Database** | PostgreSQL + [Prisma 7.5](https://www.prisma.io/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) (Saffron & Obsidian Design) |
| **Security** | JWT + RBAC + Zod (Strict Validation) |
| **Integrations** | Razorpay, Cloudinary, AWS S3, Resend, Zoho |

---

## 📂 Project Architecture

```text
├── docs/                 # PRD, Architecture, and Deployment guides
├── prisma/               # Schema, Migrations, and idempotent seeding
├── src/
│   ├── app/              # Next.js App Router (Public, Dashboard, Admin)
│   ├── components/
│   │   ├── admin/
│   │   │   └── settings/ # 🛠️ Modular "Command Center" Tabs
│   │   └── shared/       # Reusable UI primitives
│   ├── lib/              # Core Logic (Auth, Payments, Media Gateways)
│   └── middleware.ts     # Edge-level RBAC enforcement
```

### 🛠️ The Command Center (Admin Settings)
The system settings have been refactored into a high-performance **Modular Architecture** located in `src/components/admin/settings/`. Each tab is an isolated module:
- **Finance**: Taxes (CGST/SGST), fees, and company identity.
- **Communications**: Multi-channel email delivery (Zoho API/SMTP, Resend).
- **Media**: Enterprise storage configuration (S3, Cloudinary).
- **Security**: Razorpay environment and session management.
- **System**: Core SEO, Platform pulse, and Site identity.

---

## 🚀 Quick Start

### 1. Configure Environment
Clone `.env.example` to `.env` and populate your credentials.
```bash
cp .env.example .env
```

### 2. Install & Launch
```bash
npm install
npm run dev
```

### 3. Database Lifecycle
Ensure you seed the database to activate the **6 required Roles** and **26 Permissions**.
```bash
npx prisma migrate deploy
npx prisma db seed
```

> [!TIP]
> For advanced production setup, see our [Full Deployment Guide](docs/DEPLOYMENT.md).

---

## 🔐 Role-Based Access Control (RBAC)

The platform is governed by a strict RBAC system defined in the database core.

| Role              | Permissions | Description                                     |
| ----------------- | :---------: | ----------------------------------------------- |
| `SUPER_ADMIN`     |     26      | Full system access including audits             |
| `ADMIN`           |     17      | Day-to-day platform & user management           |
| `TRIP_MANAGER`    |      5      | Operations and Trek Lead coordination           |
| `TREK_LEAD`       |      6      | Ground ops & attendance (Mobile Optimized)      |
| `MEDIA_UPLOADER`  |      4      | Experience drafting and media management        |
| `REGISTERED_USER` |      4      | Default role — browse, book, and blog           |

---

## ⚓ Additional Documentation
Explore the `/docs` folder for deep-dives into the platform's blueprints:
- **[PRD](docs/01-prd.md)**: Product Requirements & Vision.
- **[Architecture](docs/architecture.md)**: Technical Blueprint.
- **[Data Schema](docs/data-schema.md)**: ER Diagram and JSON structures.
- **[API Guide](docs/rate-limiting.md)**: Rate limiting and Security.

---
© 2026 Param Adventures Private Limited. All rights reserved.
