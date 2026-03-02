# Architecture & Tech Stack - Param Adventure Phase 2

## 1. Core Tech Stack

| Layer          | Technology              | Reason                                                              |
| -------------- | ----------------------- | ------------------------------------------------------------------- |
| **Frontend**   | Next.js 16 (App Router) | SSR/SSG for SEO, dynamic routing, unified codebase.                 |
| **Styling**    | Tailwind CSS 4          | Custom Saffron/Obsidian theme, Dark/Light mode, utility-first.      |
| **Backend**    | Next.js API Routes      | Co-located with frontend, no separate server needed.                |
| **Database**   | PostgreSQL              | Robust relational data for bookings, RBAC, and audit trails.        |
| **ORM**        | Prisma                  | Type-safe schema management and query building.                     |
| **Auth**       | Custom JWT (bcrypt)     | Self-hosted auth matching Phase 1 patterns. No third-party lock-in. |
| **Payments**   | Razorpay                | Indian payment gateway with UPI, cards, and netbanking.             |
| **Media**      | AWS S3                  | Scalable storage for images and videos.                             |
| **Emails**     | AWS SES                 | Booking confirmations and notifications.                            |
| **Icons**      | Lucide React            | Consistent, lightweight icon library.                               |
| **Animations** | Framer Motion           | Smooth micro-animations and page transitions.                       |

## 2. Authentication Strategy

Custom JWT-based authentication (no third-party services like Clerk):

- **Password Hashing**: `bcryptjs` for secure password storage
- **Tokens**: JWT access tokens (short-lived) + HTTP-only refresh cookies (long-lived)
- **Social Login**: Google OAuth via `passport-google-oauth20` (future sprint)
- **Session Flow**:
  1. User registers/logs in via `/api/auth/login`
  2. Server returns JWT access token + sets refresh cookie
  3. Client stores access token in memory (never localStorage)
  4. `AuthContext` provider manages user state across the app
  5. Middleware validates tokens on protected routes

## 3. RBAC (Role-Based Access Control)

Table-based permission system with 4 entities:

```
User → UserRole → Role → RolePermission → Permission
```

- **Roles**: SUPER_ADMIN, ADMIN, TRIP_MANAGER, TRIP_GUIDE, UPLOADER, USER
- **Permissions**: Granular keys like `trip:create`, `booking:approve`, `media:upload`
- **Enforcement**: API middleware checks permissions before processing requests
- **Frontend**: `<PermissionRoute>` component gates UI based on user permissions

> See `docs/data-schema.md` for the full RBAC table definitions.

## 4. Infrastructure (AWS)

| Service        | Purpose                                      |
| -------------- | -------------------------------------------- |
| AWS App Runner | Automated deployments from GitHub            |
| Amazon RDS     | Managed PostgreSQL database                  |
| Amazon S3      | Image/video storage for experiences          |
| AWS SES        | Booking confirmation and notification emails |

## 5. Design System (Saffron & Obsidian)

- **Primary**: Saffron Gold `#FF9933` — CTAs, highlights, brand accent
- **Dark Base**: Obsidian Black `#000000` — Dark theme background
- **Light Base**: White `#FFFFFF` — Light theme background
- **Typography**: **Outfit** (headings), **Inter** (body text)

## 6. Key Architectural Decisions

1. **Documentation First**: All features mapped in `docs/` before implementation.
2. **Type-Safety**: End-to-end TypeScript to prevent implementation errors.
3. **SSR for SEO**: Server-side rendering for experience/trip pages.
4. **Phase 1 Reference**: Use Phase 1 as a reference for patterns, not a copy source.
5. **Step-by-Step Workflow**: Each change tested locally, then committed and pushed individually.
