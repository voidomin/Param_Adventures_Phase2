# Data Schema - Param Adventure Phase 2

This document defines the relational database schema (PostgreSQL + Prisma) for v1.

## 1. Authentication & RBAC

### User

| Field         | Type      | Notes                         |
| ------------- | --------- | ----------------------------- |
| `id`          | UUID (PK) | Auto-generated                |
| `email`       | String    | Unique                        |
| `password`    | String?   | Hashed with bcrypt            |
| `name`        | String    |                               |
| `roleId`      | FK        | → Role.id (one role per user) |
| `phoneNumber` | String?   |                               |
| `avatarUrl`   | String?   |                               |
| `status`      | Enum      | ACTIVE, SUSPENDED, BANNED     |
| `googleId`    | String?   | For Google OAuth (future)     |
| `deletedAt`   | DateTime? | Soft delete                   |
| `createdAt`   | DateTime  | Auto                          |
| `updatedAt`   | DateTime  | Auto                          |

### Role

| Field         | Type      | Notes                                   |
| ------------- | --------- | --------------------------------------- |
| `id`          | UUID (PK) |                                         |
| `name`        | String    | Unique (SUPER_ADMIN, ADMIN, USER, etc.) |
| `description` | String?   |                                         |
| `isSystem`    | Boolean   | Prevents accidental deletion            |

### Permission

| Field         | Type      | Notes                                      |
| ------------- | --------- | ------------------------------------------ |
| `id`          | UUID (PK) |                                            |
| `key`         | String    | Unique, e.g. `trip:create`, `media:upload` |
| `description` | String?   |                                            |
| `category`    | String?   | Grouping (trip, booking, media, etc.)      |

### RolePermission (Many-to-Many)

| Field          | Type      | Notes                  |
| -------------- | --------- | ---------------------- |
| `roleId`       | FK        | → Role.id              |
| `permissionId` | FK        | → Permission.id        |
| PK             | Composite | (roleId, permissionId) |

> **Note:** One role per user (enforced via `User.roleId` FK). No `UserRole` join table needed.

## 2. Experience Management

### Category

| Field      | Type      | Notes         |
| ---------- | --------- | ------------- |
| `id`       | UUID (PK) |               |
| `name`     | String    |               |
| `slug`     | String    | Unique        |
| `isActive` | Boolean   | Default: true |

### Experience (Trip)

| Field          | Type      | Notes                          |
| -------------- | --------- | ------------------------------ |
| `id`           | UUID (PK) |                                |
| `title`        | String    |                                |
| `slug`         | String    | Unique, auto-generated         |
| `description`  | String    |                                |
| `itinerary`    | JSON      | Day-wise plan                  |
| `price`        | Int       | In paise (₹)                   |
| `durationDays` | Int       |                                |
| `difficulty`   | Enum      | EASY, MODERATE, HARD, EXTREME  |
| `location`     | String    |                                |
| `capacity`     | Int       |                                |
| `status`       | Enum      | DRAFT → PUBLISHED → ARCHIVED   |
| `category`     | Enum      | TREK, CAMPING, SPIRITUAL, etc. |
| `coverImageId` | FK?       | → Image.id                     |
| `isFeatured`   | Boolean   | Homepage spotlight             |
| `startDate`    | DateTime  |                                |
| `endDate`      | DateTime  |                                |
| `deletedAt`    | DateTime? | Soft delete                    |

## 3. Booking & Payments

### Booking

| Field           | Type      | Notes                           |
| --------------- | --------- | ------------------------------- |
| `id`            | UUID (PK) |                                 |
| `userId`        | FK        | → User.id                       |
| `tripId`        | FK        | → Experience.id                 |
| `status`        | Enum      | REQUESTED, CONFIRMED, CANCELLED |
| `guests`        | Int       | Default: 1                      |
| `totalPrice`    | Int       | Frozen at booking time          |
| `paymentStatus` | Enum      | PENDING, PAID, FAILED           |
| `startDate`     | DateTime  |                                 |

### Payment

| Field               | Type      | Notes                       |
| ------------------- | --------- | --------------------------- |
| `id`                | UUID (PK) |                             |
| `bookingId`         | FK        | → Booking.id                |
| `provider`          | Enum      | RAZORPAY (default)          |
| `providerOrderId`   | String    | Razorpay order ID           |
| `providerPaymentId` | String?   | Razorpay payment ID         |
| `amount`            | Int       | In paise                    |
| `currency`          | String    | Default: INR                |
| `status`            | Enum      | CREATED, CAPTURED, FAILED   |
| `method`            | Enum      | CARD, UPI, NETBANKING, etc. |

## 4. Content & Media

### Blog

| Field          | Type      | Notes                            |
| -------------- | --------- | -------------------------------- |
| `id`           | UUID (PK) |                                  |
| `title`        | String    |                                  |
| `slug`         | String    | Unique                           |
| `content`      | JSON      | Rich text editor output          |
| `status`       | Enum      | DRAFT, PENDING_REVIEW, PUBLISHED |
| `authorId`     | FK        | → User.id                        |
| `coverImageId` | FK?       | → Image.id                       |
| `tripId`       | FK?       | Optional link to experience      |

### Image

| Field          | Type      | Notes                 |
| -------------- | --------- | --------------------- |
| `id`           | UUID (PK) |                       |
| `originalUrl`  | String    | Full-size (S3)        |
| `mediumUrl`    | String    | Optimized for display |
| `thumbUrl`     | String    | Thumbnail             |
| `type`         | Enum      | IMAGE, VIDEO          |
| `uploadedById` | FK        | → User.id             |

### HeroSlide

| Field      | Type      | Notes                |
| ---------- | --------- | -------------------- |
| `id`       | UUID (PK) |                      |
| `title`    | String    |                      |
| `subtitle` | String?   |                      |
| `videoUrl` | String    | Background video URL |
| `ctaLink`  | String?   | CTA button target    |
| `order`    | Int       | Display sequence     |

## 5. System

### AuditLog

| Field        | Type      | Notes                          |
| ------------ | --------- | ------------------------------ |
| `id`         | UUID (PK) |                                |
| `actorId`    | FK?       | → User.id                      |
| `action`     | Enum      | TRIP_CREATED, USER_LOGIN, etc. |
| `targetType` | String    | e.g. "Trip", "Booking"         |
| `targetId`   | String?   |                                |
| `metadata`   | JSON?     | Extra context                  |

## 6. Integrity Rules

1. **Capacity Check**: Transaction lock verifies remaining capacity before creating a Booking.
2. **Soft Deletes**: `deletedAt` on Users, Experiences, Blogs, Bookings.
3. **RBAC Enforcement**: API middleware checks user permissions via the Role → Permission chain.
4. **Price Freeze**: `totalPrice` is stored at booking time to handle future price changes.
