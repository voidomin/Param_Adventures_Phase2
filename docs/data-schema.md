# Data Schema - Param Adventure Phase 2

This document defines the relational database schema required to support the PRD (v1.3) and Roles & Access (v2.1) specifications.

## 1. Core Entities (ERD)

### User & Authentication

- **`User`**: Core user record.
  - `id` (UUID, PK)
  - `email` (string, unique)
  - `passwordHash` (string)
  - `role` (Enum: GUEST, REGISTERED_USER, MEDIA_UPLOADER, TREK_LEAD, TRIP_MANAGER, ADMIN, SUPER_ADMIN)
  - `isVerified` (boolean)
  - `profileImage` (string, nullable)
  - `createdAt`, `updatedAt`

### Experience Management

- **`Category`**: Admin-managed event categories.
  - `id` (UUID, PK)
  - `name` (string)
  - `slug` (string, unique)
  - `isActive` (boolean)
- **`Experience`**: The central "product".
  - `id` (UUID, PK)
  - `title` (string)
  - `description` (Rich Text)
  - `itinerary` (JSON/Rich Text)
  - `basePrice` (Decimal)
  - `schedulingType` (Enum: FIXED, FLEXIBLE)
  - `capacity` (Integer) - Default if no slots specified
  - `status` (Enum: DRAFT, PUBLISHED, ARCHIVED)
  - `images` (String Array)
  - `difficulty` (Enum: EASY, MODERATE, STRENUOUS)
- **`ExperienceCategory`**: Many-to-Many join table.
- **`Slot`**: Specific dates for FIXED experiences.
  - `id` (UUID, PK)
  - `experienceId` (FK)
  - `date` (DateTime)
  - `capacity` (Integer)
  - `remainingCapacity` (Integer) - strictly enforced

### Booking & Payments

- **`Booking`**: User booking record.
  - `id` (UUID, PK)
  - `userId` (FK)
  - `experienceId` (FK)
  - `slotId` (FK, nullable)
  - `participantCount` (Integer)
  - `totalPrice` (Decimal)
  - `bookingStatus` (Enum: INITIATED, CONFIRMED, FAILED, CANCELLED)
  - `paymentStatus` (Enum: PENDING, SUCCESS, FAILED)
- **`Payment`**: Transaction history (razorpay driven).
  - `id` (UUID, PK)
  - `bookingId` (FK)
  - `razorpayPaymentId` (string)
  - `amount` (Decimal)
  - `fullPayload` (JSON) - Immutable

### Operations & Blogs

- **`TripAssignment`**: Trek Lead assignments.
  - `id` (UUID, PK)
  - `slotId` (FK)
  - `trekLeadId` (FK)
- **`Blog`**: Content from users/admins.
  - `id` (UUID, PK)
  - `authorId` (FK)
  - `tripId` (FK) - Linked to a completed booking
  - `title`, `content`, `images`
  - `status` (Enum: DRAFT, SUBMITTED, APPROVED, REJECTED)
  - `rejectionReason` (string, nullable)

### System Logs

- **`AuditLog`**: Immutable history.
  - `id` (UUID, PK)
  - `actorId` (FK, nullable for Guests)
  - `action` (string)
  - `targetType` (string)
  - `targetId` (string)
  - `payload` (JSON)
  - `timestamp` (DateTime, default: now)

## 2. Integrity Rules

1. **Capacity Check**: A database trigger or transaction lock must verify `remainingCapacity` before creating a `Booking`.
2. **Soft Deletes**: Use `deletedAt` for critical entities (Users, Experiences, Bookings).
3. **Role Enforcement**: RBAC is enforced at the API level using the `User.role` field.
