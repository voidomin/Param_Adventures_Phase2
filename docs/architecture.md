# Architecture & Tech Stack - Param Adventure Phase 2

## 1. Core Tech Stack

| Layer          | Technology              | Reason                                                              |
| -------------- | ----------------------- | ------------------------------------------------------------------- |
| **Framework**   | Next.js 16.2 (App Router) | Latest Next.js features, SSR/SSG for SEO, and Turbopack support.    |
| **Library**     | React 19.0              | Strict mode, concurrent rendering, and high-performance UI state.   |
| **Styling**    | Tailwind CSS 4          | Native CSS variables, Saffron/Obsidian theme, and unified styling.  |
| **Database**   | PostgreSQL              | Robust relational data for bookings, RBAC, and audit trails.        |
| **ORM**        | Prisma 7.5              | Type-safe schema management and query building.                     |
| **Auth**       | Custom JWT (bcrypt)     | Self-hosted auth matching Phase 1 patterns. No third-party lock-in. |
| **Payments**   | Razorpay                | Indian payment gateway with UPI, cards, and netbanking.             |
| **Media**      | AWS S3 & Cloudinary     | Multi-provider storage support (S3 for raw, Cloudinary for web).   |
| **Emails**     | Resend & Zoho API       | Dual-provider system for reliable cloud-native delivery.            |
| **Icons**      | Lucide React            | Consistent, lightweight icon library.                               |
| **Animations** | Framer Motion           | Smooth micro-animations and page transitions.                       |

## 2. Authentication Strategy

Custom JWT-based authentication (no third-party services like Clerk):

- **Password Hashing**: `bcryptjs` for secure password storage.
- **Tokens**: JWT access tokens (short-lived) + HTTP-only refresh cookies (long-lived).
- **Session Flow**:
  1. User registers/logs in via `/api/auth/login`.
  2. Server returns JWT access token + sets refresh cookie.
  3. Client stores access token in memory (never localStorage).
  4. `AuthContext` provider manages user state across the app.
  5. Middleware validates tokens on protected routes.

## 3. RBAC (Role-Based Access Control)

Table-based permission system with 4 entities:

```
User → UserRole → Role → RolePermission → Permission
```

- **Roles**: `SUPER_ADMIN`, `ADMIN`, `TRIP_MANAGER`, `TREK_LEAD`, `MEDIA_UPLOADER`, `REGISTERED_USER`.
- **Permissions**: Granular keys like `trip:create`, `booking:approve`, `system:config`.
- **Enforcement**: API middleware checks permissions before processing requests.
- **Frontend**: `TabProps` and `getVal`/`updateSetting` patterns in the Admin Dashboard.

> See `docs/data-schema.md` for the full RBAC table definitions.

## 4. Infrastructure (Render & AWS)

The platform is built for cloud-native scalability, with **Render** as the primary staging/UAT environment and **AWS** as the production target.

| Service        | Provider      | Purpose                                      |
| -------------- | ------------- | -------------------------------------------- |
| **Web Service**| Render / AWS  | Next.js server hosting and deployment.       |
| **Database**   | Render / RDS  | Managed PostgreSQL with high availability.   |
| **Storage**    | S3 / Cloudinary| Scalable media library and optimizations.    |
| **Monitoring** | Sentry        | Real-time error tracking and performance.    |
| **Repository** | GitHub        | CI/CD via GitHub Actions and Render Blueprints. |

## 5. Modular "Command Center" Architecture

The System Settings (Command Center) are built using a **Modular Tab Architecture** located in `src/components/admin/settings/`.

- **Isolated Modules**: `FinanceTab`, `CommunicationsTab`, `MediaTab`, `SecurityTab`, `SystemTab`.
- **Decoupled Logic**: Each tab communicates with the parent state via a standardized `TabProps` interface.
- **Consistency**: Centralized layout in `/admin/settings/system/page.tsx` ensures a unified UX while maintaining code separation.

## 6. Key Architectural Decisions

1. **Documentation First**: All features mapped in `docs/` before implementation.
2. **Type-Safety**: End-to-end TypeScript (Zod + Prisma) to prevent runtime errors.
3. **SSR for SEO**: Server-side rendering for experience and blog pages to maximize search visibility.
4. **Res resilient Emails**: Dual-channel support (Zoho SMTP/API and Resend) ensures 100% delivery reliability.
5. **Security Hardening**: Strict Content Security Policy (CSP), XSS protection, and idempotent transactions.
