# Roles & Access Control Specification
**Product:** Param Adventures  
**Version:** 2.1 (Final — Awaiting Approval)  
**Status:** Draft for Approval  
**Last Updated:** February 2026  

---

## 1. Purpose of This Document

This document defines:
- Every role that exists in V1
- Exactly what each role can and cannot do
- Ownership rules — who owns what data
- Permission boundaries — enforced by the system, not by trust
- How roles are assigned and managed from the admin dashboard
- System configuration powers (Super Admin only)

This is the authoritative reference for all authorization decisions in the codebase. Every feature, API endpoint, and UI route that requires access control must trace back to this document.

---

## 2. V1 Role Summary

Param Adventures V1 has seven roles:

| # | Role | Type | Count |
|---|---|---|---|
| 1 | Guest | Public / Unauthenticated | Unlimited |
| 2 | Registered User | Authenticated / Customer | Unlimited |
| 3 | Media Uploader | Internal / Operational | Managed by Admin |
| 4 | Trek Lead | Internal / Operational | Managed by Admin + Trip Manager |
| 5 | Trip Manager | Internal / Operational | Managed by Admin |
| 6 | Admin | Internal / Management | Managed by Super Admin |
| 7 | Super Admin | System / Authority | Maximum 3–4 people |

**Role hierarchy (low to high):**  
Guest → Registered User → Media Uploader / Trek Lead → Trip Manager → Admin → Super Admin

**One role per user at all times.** A user cannot hold multiple roles simultaneously.

---

## 3. Role Definitions & Permissions

---

### 3.1 Guest (Unauthenticated)

Anyone visiting the platform without logging in.

**Mutation Type:** Read-only — no mutations allowed

#### Can Do
- Browse all published experience listings
- Filter experiences by category
- Search experiences by name or keyword
- View full experience detail pages (itinerary, pricing, dates, capacity status, images)
- Read published blog posts
- Submit contact and enquiry forms
- View all three legal pages (T&C, Privacy Policy, Cancellation & Refund Policy)
- Share experience and blog pages via social share buttons

#### Cannot Do
- Book any experience
- Make any payment
- Create any content
- Access any user, booking, or payment data
- Access any internal or admin pages

---

### 3.2 Registered User (Authenticated Customer)

A person who has created an account and verified their email address.

**Mutation Type:** Self-scoped mutations only — can only read and modify their own data

#### Registration & Access
- Registers with email and password
- Email verification required before first booking
- After verification, can book immediately — no admin approval needed
- Can browse all public content before email verification

#### Can Do — Booking
- Book any published experience (individual or group)
- Specify number of participants per booking (subject to available capacity)
- Complete payment via Razorpay
- View own booking history
- View own booking status (Initiated, Confirmed, Failed, Cancelled)
- View own payment status (Pending, Success, Failed)

#### Can Do — Blogs
- Write and submit blog posts **only about trips they have booked and completed**
- A trip is "completed" when its date has passed and booking was Confirmed
- Blog must be about a specific trip the user attended — not general content
- Edit own blogs while in Draft state
- View approval status of own submitted blogs
- Resubmit a rejected blog after editing

#### Cannot Do
- View other users' bookings, profiles, or payment data
- Publish a blog directly — all blogs require admin approval
- Edit a blog once approved
- Cancel their own booking — admin-handled in V1
- Access any internal, operational, or admin pages
- Modify their own role

---

### 3.3 Media Uploader (Internal — Operational)

An internal team member responsible for creating and maintaining experience content.

**Mutation Type:** Content-scoped mutations — no booking, payment, or user access

**Assigned by:** Admin or Super Admin (via admin dashboard)

#### Can Do
- Upload media (images, videos, documents) to the media library
- Create new experience drafts
- Edit existing experiences (title, description, itinerary, pricing, images, difficulty, scheduling, capacity)
- Organize and manage uploaded media assets

#### Cannot Do
- Publish or archive experiences — publish and archive is Admin only
- Approve or reject blogs
- View any booking or payment data
- View participant lists or user details
- Access user management or assign any roles

#### Notes
- All experience edits remain in Draft or current state until Admin publishes
- Media Uploader cannot move an experience from Draft to Published under any circumstance

---

### 3.4 Trek Lead (Internal — Operational)

A field team member who physically leads a specific assigned trip or event on the ground.

**Mutation Type:** Trip-scoped mutations only — restricted to assigned trips only

**Assigned by:** Trip Manager or Admin (both can assign, via admin dashboard)

**Constraint:** Trek Lead and Trip Manager are always different people — one person cannot hold both roles on the same trip.

#### Can Do — Assigned Trips Only
- View full details of their assigned trips (read-only)
- View complete participant list for their assigned trip including:
  - Full name, phone number, email address
  - Booking status and number of participants per booking
- Mark attendance for participants on the day of the trip
- Add operational notes during or after the trip
- Upload post-trip media (images) to the trip record
- Upload trip expense documents (bills, receipts, PDFs) incurred during the trip

#### Cannot Do
- View any trip they are not assigned to
- View payment amounts or transaction details
- Export or bulk download participant data
- Create, edit, publish, or archive experiences
- Approve or reject any content
- Access any admin pages or assign any roles

#### Notes
- Expense documents uploaded by Trek Lead are visible only to Trip Manager, Admin, and Super Admin — never to users
- Participant data is scoped strictly to the Trek Lead's assigned trip only

---

### 3.5 Trip Manager (Internal — Operational)

An internal team member responsible for organizing and managing the operational execution of trips and events.

**Mutation Type:** Operational-scoped mutations — manages trips and Trek Leads, no financial or user management access

**Assigned by:** Admin or Super Admin (via admin dashboard)

**Constraint:** Trip Manager and Trek Lead are always separate people — one person cannot hold both roles on the same trip.

#### Can Do
- View all experiences and trips (read-only)
- Assign and unassign Trek Leads to specific trips (via admin dashboard)
- View participant lists across all trips (name, contact, booking status)
- View post-trip notes, attendance records, and media uploaded by Trek Leads
- View trip expense documents uploaded by Trek Leads (bills, PDFs, receipts)
- Add operational notes to any trip

#### Cannot Do
- Create, edit, publish, or archive experiences
- View payment amounts or transaction IDs
- Cancel bookings or initiate refunds
- Approve or reject blogs
- Access user management or assign roles (other than assigning Trek Leads to trips)
- Export or bulk download participant data
- View audit logs

---

### 3.6 Admin

An internal team member responsible for day-to-day platform management and content oversight.

**Mutation Type:** System-level mutations within defined boundaries — cannot access financial records or system configuration

**Assigned by:** Super Admin only (via admin dashboard)

#### Has Everything Trip Manager and Media Uploader Have, Plus:

#### Can Do — Experience Management
- Publish experiences (Draft → Published)
- Archive experiences (Published → Archived)
- Archived experiences remain visible to Admin for records — not bookable

#### Can Do — Category Management
- Add, rename, and deactivate categories — no developer involvement needed

#### Can Do — Booking Management
- View all bookings across all experiences
- Cancel bookings on behalf of users
- Initiate refunds via Razorpay

#### Can Do — Blog Moderation
- Approve or reject submitted blogs (with written reason on rejection)
- Revert an approved blog to Draft state

#### Can Do — Role Management (Admin Dashboard)
- View all registered users and their current roles
- Assign roles to any Registered User: Media Uploader, Trek Lead, Trip Manager
- Remove operational roles — reverts user to Registered User
- Cannot assign or remove Admin or Super Admin roles

#### Can Do — User Management
- View all registered users and their booking history
- Deactivate user accounts

#### Receives
- Email + SMS notification on every new confirmed booking

#### Cannot Do
- Assign or remove Admin or Super Admin roles
- Access the system configuration panel
- View raw payment gateway payloads or full transaction IDs
- Modify or delete audit log entries
- Hard delete any critical entity
- Override capacity limits
- Change their own role

---

### 3.7 Super Admin

The highest authority in the system. Responsible for platform integrity, system configuration, role management, financial oversight, and emergency actions.

**Mutation Type:** Full system access

**Count:** Maximum 3–4 people. System-enforced hard limit.

**Assigned by:** Only another Super Admin can assign this role.

#### Has Everything Admin Has, Plus:

#### Can Do — System Configuration Panel (Exclusive to Super Admin)
No developer involvement required for any of these actions.

| Config Area | What Super Admin Can Do |
|---|---|
| SMTP / Email server | Add, edit, and switch email server configuration |
| SMS gateway | Add, edit, and switch SMS gateway configuration |
| Razorpay keys | Update API keys and webhook secrets |
| Feature flags | Turn platform features on or off without a deployment |
| Other API keys | Add, edit, and manage any third-party service credentials |
| Environment variables | Manage application-level config values from inside the app |

All configuration changes are audit logged with actor, timestamp, and what was changed.

#### Can Do — Role Management (Admin Dashboard)
- Assign and remove any role including Admin and Super Admin
- System blocks assignment of a 5th Super Admin

#### Can Do — Financial Visibility
- View full payment details: amounts, transaction IDs, Razorpay payloads
- View complete financial history per booking for audit and dispute resolution

#### Can Do — Audit & Compliance
- View full system audit logs across all actors and all actions (read-only)

#### Can Do — Emergency Actions
- Revert any content state
- Force-cancel a booking in inconsistent payment state
- Trigger manual notification resend for any event

#### Cannot Do
- Modify or delete audit log entries — always append-only
- Exceed the 3–4 Super Admin cap (system enforced)
- Hard delete financial records

---

## 4. Role Management (Admin Dashboard)

This is a dedicated section defining exactly how roles are assigned, changed, and removed from inside the admin dashboard.

### 4.1 Core Rules

- **One role per user at all times** — assigning a new role automatically removes the previous role
- **Must be a Registered User first** — a user must have a registered and verified account before any internal role can be assigned. Roles cannot be pre-assigned.
- **Every assignment is logged** — every role change generates a full audit log entry

### 4.2 Who Can Assign What

| Role Being Assigned | Who Can Assign | Who Can Remove |
|---|---|---|
| Media Uploader | Admin, Super Admin | Admin, Super Admin |
| Trek Lead | Admin, Super Admin | Admin, Super Admin, Trip Manager |
| Trip Manager | Admin, Super Admin | Admin, Super Admin |
| Admin | Super Admin only | Super Admin only |
| Super Admin | Super Admin only | Super Admin only |

### 4.3 Assignment Workflow

1. Admin or Super Admin opens User Management in the dashboard
2. Searches for the target user by name or email
3. User must already be a Registered User — they must register first if not
4. Role selector shows only roles the assigner is permitted to assign
5. If user already has a role, system warns that the new role will replace it
6. Assigner confirms — role updates immediately, access changes take effect instantly
7. Audit log entry is created
8. User receives an email notification about their new role

### 4.4 Role Change & Removal Behaviour

- User immediately loses access to old role features and gains access to new role features
- Any in-progress work (e.g. Trek Lead assigned to an active trip) must be reviewed before role change
- Removing an internal role reverts the user to Registered User — they keep their account and booking history
- User receives email notification on role removal
- System blocks a 5th Super Admin assignment

---

## 5. Permission Matrix (Quick Reference)

| Action | Guest | Reg. User | Media Uploader | Trek Lead | Trip Manager | Admin | Super Admin |
|---|---|---|---|---|---|---|---|
| Browse & view experiences | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read blogs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit enquiry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register account | ✅ | — | — | — | — | — | — |
| Book experience | ❌ | ✅ | ❌ | ❌ | ❌ | — | — |
| View own bookings | ❌ | ✅ | ❌ | ❌ | ❌ | — | — |
| Write blog (post completed trip) | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Publish blog directly | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Upload media | ❌ | ❌ | ✅ | ✅ (trip only) | ❌ | ✅ | ✅ |
| Create / edit experience drafts | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Publish / archive experiences | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View assigned trip participants | ❌ | ❌ | ❌ | ✅ (own trip) | ✅ (all) | ✅ | ✅ |
| Mark attendance | ❌ | ❌ | ❌ | ✅ (own trip) | ❌ | ❌ | ✅ |
| Add trip notes | ❌ | ❌ | ❌ | ✅ (own trip) | ✅ (all) | ✅ | ✅ |
| Upload expense docs | ❌ | ❌ | ❌ | ✅ (own trip) | ❌ | ❌ | ✅ |
| View expense docs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign Trek Leads to trips | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign operational roles (dashboard) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign Admin role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign Super Admin role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all bookings | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cancel booking + initiate refund | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve / reject blogs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View full payment details | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| System config panel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Modify audit logs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Override capacity | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hard delete records | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 6. Data Ownership Rules

| Entity | Owned By | Readable By | Mutable By |
|---|---|---|---|
| User profile | Registered User | Self, Admin, Super Admin | Self (limited), Super Admin |
| Bookings | Registered User | Self, Trip Manager, Admin, Super Admin | Admin, Super Admin |
| Payment records | System | Self (status only), Admin (status only), Super Admin (full) | Immutable after completion |
| Blog drafts | Registered User | Self, Admin, Super Admin | Self (Draft only) |
| Published blogs | System | Public | Admin, Super Admin |
| Experiences | System | Public (published), all internal roles | Media Uploader (draft/edit), Admin (publish/archive), Super Admin |
| Categories | System | Public | Admin, Super Admin |
| Trek assignments | System | Trek Lead (own), Trip Manager, Admin, Super Admin | Trip Manager, Admin, Super Admin |
| Attendance records | System | Trip Manager, Admin, Super Admin | Trek Lead (own trip only) |
| Trip notes | System | Trip Manager, Admin, Super Admin | Trek Lead (own trip), Trip Manager, Admin, Super Admin |
| Expense documents | System | Trip Manager, Admin, Super Admin | Trek Lead (own trip — upload only) |
| Media library | System | All internal roles | Media Uploader, Trek Lead (trip media), Admin, Super Admin |
| System config | System | Super Admin only | Super Admin only |
| Audit logs | System | Admin (own actions), Super Admin (all) | Nobody — append only |

---

## 7. System-Level Enforcement Rules

- **One role per user** — assigning a new role removes the old one automatically
- **No self-permission changes** — no user can modify their own role
- **Server-side authorization** — all permission checks happen server-side only
- **Registered User prerequisite** — internal roles can only be assigned to existing Registered Users
- **Soft deletes only** — no hard deletion of bookings, payments, users, or experiences
- **Immutable payments** — payment records cannot be modified after completion
- **Append-only audit logs** — audit entries can never be edited or deleted
- **Strict capacity** — system never confirms a booking that exceeds capacity
- **Email verification gate** — bookings blocked until email is verified
- **Blog post-trip gate** — blog creation blocked unless user has a completed confirmed booking; blog must link to a specific trip attended
- **Trek Lead isolation** — Trek Lead sees only their assigned trips
- **Expense doc visibility** — internal only; never visible to users
- **Trek Lead / Trip Manager separation** — cannot be the same person on the same trip
- **System config isolation** — accessible only to Super Admin
- **Super Admin cap** — system blocks a 5th Super Admin assignment

---

## 8. Audit Logging Requirements

Every audit log entry must record: **Actor, Action, Target, Timestamp, Result**

| Action | Logged |
|---|---|
| User registration | ✅ |
| Login and logout | ✅ |
| Booking created, confirmed, cancelled | ✅ |
| Payment initiated, success, failed | ✅ |
| Refund initiated | ✅ |
| Experience created, published, archived | ✅ |
| Blog submitted, approved, rejected | ✅ |
| Trek Lead assigned / removed from trip | ✅ |
| Attendance marked | ✅ |
| Expense document uploaded | ✅ |
| Role assigned or removed | ✅ |
| User deactivated | ✅ |
| System config changed | ✅ |
| Feature flag toggled | ✅ |

---

## 9. Blog Writing Rules (Registered User)

**Restriction 1 — Trip completion gate:** User must have at least one completed confirmed booking before blog creation is unlocked.

**Restriction 2 — Trip-specific gate:** The blog must be linked to a specific trip from the user's own completed booking history. General travel content is not permitted.

**Workflow:** User selects completed trip → writes blog as Draft → submits for approval → Admin approves or rejects with reason → approved blogs are public and attributed to the trip.

---

## 10. Document Version History

| Version | Changes | Date |
|---|---|---|
| v1.0 | Initial — 4 roles: Guest, Registered User, Admin, Super Admin | Feb 2026 |
| v2.0 | Full rewrite — 7 roles. Added Media Uploader, Trek Lead, Trip Manager. Super Admin system config panel. Blog rules tightened. Expense document rules. Trek Lead / Trip Manager separation. | Feb 2026 |
| v2.1 | Added dedicated Role Management section (Section 4). One-role-per-user rule. Assignment workflow. Who can assign what table. Role change and removal behaviour. Role notification emails. Super Admin cap enforcement. | Feb 2026 |

---

**Status: Awaiting Approval**

Reply with:
- ✅ Approved — lock it and move to Document 3: FRD
- ✅ Approved with changes — list what to change
- ❌ Needs rework — explain why
