# Architecture & Tech Stack - Param Adventure Phase 2

To meet the requirements of SEO, dynamic visuals, and AWS optimization, I propose a modern, full-stack architecture using the following industry-standard technologies.

## 1. Core Tech Stack

| Layer        | Technology                   | Reason                                                                  |
| ------------ | ---------------------------- | ----------------------------------------------------------------------- |
| **Frontend** | **Next.js 14+ (App Router)** | Best-in-class SEO, fast page loads with SSR/SSG, and dynamic routing.   |
| **Styling**  | **Tailwind CSS**             | Highly efficient for custom themes (Black/Saffron) and Dark/Light mode. |
| **Backend**  | **Next.js API Routes**       | Unified codebase (monorepo), scalable, and fast to develop.             |
| **Database** | **PostgreSQL**               | Robust relational data for complex booking cycles and user roles.       |
| **ORM**      | **Prisma**                   | Provides type-safety and efficient management of database schemas.      |
| **Auth**     | **Clerk or NextAuth.js**     | Easy-to-implement Role-Based Access Control (RBAC).                     |

## 2. Infrastructure (AWS)

- **Compute**: **AWS App Runner** or **AWS Amplify Hosting** for automated deployments from GitHub.
- **Database**: **Amazon RDS (PostgreSQL)** for a managed, production-grade database.
- **Storage**: **Amazon S3** for hosting event images and tour media.
- **Emails**: **AWS SES (Simple Email Service)** for booking confirmations.

## 3. Design System (Param Gold & Obsidian)

- **Primary Colors**: Black (Dark Mode Base) and Saffron (#FF9933).
- **Secondary Colors**: Slate Gray (Gradients) and White (Light Mode Base).
- **Typography**: Modern sans-serif (e.g., _Inter_ or _Outfit_) for a premium, travel-oriented feel.

## 4. Key Architectural Decisions

- **Documentation First**: All features are mapped in `docs/` before implementation.
- **Type-Safety**: End-to-end TypeScript to prevent the "implementation errors" seen in Phase 1.
- **SEO Strategy**: Server-side rendering (SSR) for event pages to ensure they are indexable by search engines.
