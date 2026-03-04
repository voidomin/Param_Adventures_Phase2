# Product Requirements Document (PRD)

**Product:** Param Adventures  
**Version:** 1.3 (Final — Awaiting Approval)  
**Status:** Draft for Approval  
**Last Updated:** February 2026

---

## 1. Product Identity

| Field             | Detail                                                |
| ----------------- | ----------------------------------------------------- |
| Product Name      | Param Adventures                                      |
| Product Type      | Multi-category outdoor & experiential events platform |
| Current Version   | V1                                                    |
| Payment Gateway   | Razorpay                                              |
| Target Region     | Pan-India                                             |
| Deployment Target | AWS                                                   |

---

## 2. Product Vision

Param Adventures is a full-stack experiential events platform that organizes, markets, and manages real-world experiences — including treks, spiritual journeys, corporate outings, city walks, camping, educational trips, and more — through a single trusted digital platform.

The platform combines:

- Curated, categorized experience listings with fixed and flexible scheduling
- Group and individual booking with Razorpay payment
- Content-driven trust through blogs and storytelling
- Real-time email and SMS notifications to users and admins
- A fully mobile-first experience across every surface

This is not a travel blog. It is not just a booking tool. It is a complete experience platform built for real operations, real users, and real payments.

---

## 3. Business Intent

- Operate as a real, production-ready business platform from day one
- Support real users, real bookings, and real payments
- Launch with approximately 20 live experiences across multiple categories
- Pan-India reach at launch with architecture that supports future expansion
- Admin team must be able to manage all operations without developer involvement

---

## 4. The Problem It Solves

People looking for organized, trustworthy outdoor and experiential events in India face fragmented and unreliable options:

- Travel blogs have no booking capability
- Generic booking platforms lack authenticity and storytelling
- Most adventure organizers operate over WhatsApp with no digital trail
- Users have no way to verify trust before paying
- Group coordination for experiences is painful and manual

**Param Adventures solves this** by combining real curated experiences, transparent pricing, authentic storytelling, group-friendly booking, and reliable digital payments in one place — giving users confidence before they pay and giving the business scalable digital operations.

---

## 5. Target Users

### Primary Users

- Adventure seekers, trekkers, nature lovers
- Spiritual travelers seeking organized pilgrimage or temple circuits
- Corporate teams looking for managed group outings and team-building
- Students, families, and groups seeking educational or nature-based trips
- Urban explorers interested in city walks, heritage tours, and small events

### Secondary Users

- Content readers exploring trip stories who may convert into bookers over time
- Internal admin team managing experiences, bookings, and content

### Geography

Pan-India at launch. No restriction on user location.

### Budget Segment

Mid-range. Users are paying for safety, organization, and quality of experience — not the cheapest option, not luxury.

### Device Behavior

The majority of Indian users will access the platform via mobile. Mobile is the primary use case. All decisions are made with mobile first.

---

## 6. Experience Categories

Categories are **fully dynamic and admin-managed**. They are not hardcoded anywhere in the system.

### Rules

- Admin can add new categories at any time as the business grows
- Admin can rename or deactivate categories at any time
- Each experience can be tagged to one or more categories
- Public category filtering is driven entirely by what exists in the system
- No developer involvement required to manage categories

### Seed Categories at Launch

The following are starting categories only — not a fixed or exhaustive list:

| Category             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| Trekking & Adventure | Mountain treks, trail hikes, outdoor challenges         |
| Spiritual Trips      | Temple circuits, pilgrimage routes, meditation retreats |
| Corporate Events     | Team outings, offsites, corporate team-building         |
| City Walking Tours   | Heritage walks, food walks, urban exploration           |
| Camping              | Overnight camps, stargazing, forest stays               |
| Educational Trips    | Nature education, cultural visits, learning experiences |
| Small Events         | One-day events, workshops, community gatherings         |

New categories will be added by admin as the business evolves.

---

## 7. Experience Scheduling

Each experience supports one of two scheduling models, configured by admin per experience:

| Scheduling Type       | Description                                                      | Example                              |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Fixed-date slots      | Admin defines specific dates. Users book into an available slot. | Trek on 15 March, 22 March           |
| Flexible / on-request | No fixed dates. User submits interest and admin confirms dates.  | Corporate outing, private group walk |

Both models must be supported in V1. The booking flow adapts based on which scheduling type the experience uses.

---

## 8. Capacity Management

- Every experience and every fixed-date slot has a **maximum participant capacity** set by admin
- Capacity is **strictly enforced** — no overbooking is allowed under any circumstance
- Group bookings reduce available capacity by the number of participants booked
- When an experience or slot reaches full capacity it is automatically marked **Sold Out**
- Sold Out experiences remain visible to users but cannot be booked
- Admin cannot override capacity in V1 — this is a hard system rule
- Flexible / on-request experiences also have a capacity limit per confirmed session

---

## 9. Booking & Pricing

### Group Booking

- A single user can book for multiple participants in one transaction
- User specifies the number of participants at time of booking
- Total price is calculated as: **price per person × number of participants**
- One booking confirmation covers all participants in the group
- One payment transaction covers the full group amount

### Pricing Model

- Pricing is always **per person** for all experience types in V1
- No flat group pricing in V1
- Admin sets the per-person price per experience (and per slot if fixed-date)

### Payment Flow

1. User selects experience and number of participants
2. Total amount calculated and displayed clearly before payment
3. System checks capacity — if insufficient spots remain, booking is blocked
4. Razorpay payment initiated
5. On payment success → booking instantly confirmed, capacity reduced, notifications sent
6. On payment failure → booking marked as failed, user notified, capacity not reduced
7. Razorpay webhook drives all booking state transitions
8. All payment records are immutable after completion

---

## 10. V1 Feature Scope

### 10.1 Public (No Login Required)

- Browse all published experiences with dynamic category filtering
- Search experiences by name or keyword
- View full experience detail pages including:
  - Title, description, and highlights
  - Full itinerary
  - Pricing per person
  - Available dates or flexible scheduling indicator
  - Remaining capacity or Sold Out status
  - Difficulty level
  - Experience images
  - Category tags
- Read published blog posts and stories
- Submit contact and enquiry forms
- Social share buttons on experience detail pages and blog posts
- All public pages must be SEO-friendly with proper meta tags
- Sitemap (sitemap.xml) and robots.txt present at launch

### 10.2 User Accounts

- Register with email — email verification required before first booking
- Login and logout securely
- Session expiry enforced — users are logged out after inactivity
- View and manage personal profile
- Browse and book experiences (individual or group)
- Complete payment via Razorpay
- Receive instant booking confirmation on payment success
- View personal booking history with participant count and payment status
- View payment status for own bookings only
- Write and submit blog posts for admin approval
- View approval status of submitted blogs

### 10.3 Notifications

All major events trigger both Email and SMS.

| Event                          | User Notified  | Admin Notified |
| ------------------------------ | -------------- | -------------- |
| Booking confirmed              | ✅ Email + SMS | ✅ Email + SMS |
| Booking cancelled              | ✅ Email + SMS | ✅ Email + SMS |
| Payment failed                 | ✅ Email + SMS | —              |
| Blog approved                  | ✅ Email + SMS | —              |
| Blog rejected                  | ✅ Email + SMS | —              |
| Experience reminder (pre-trip) | ✅ Email + SMS | —              |

Notification services to be finalized in the Tech Stack document.  
Candidates — Email: AWS SES, SendGrid, Resend  
Candidates — SMS: MSG91, Twilio, AWS SNS  
Both services are **V1 requirements — not optional.**

### 10.4 Admin Panel

- Experience management:
  - Create, edit, publish, and archive experiences
  - Configure scheduling type (fixed-date or flexible) per experience
  - Set and manage participant capacity per experience and per slot
  - Manage fixed-date slots (add, edit, remove dates)
- Category management (add, rename, deactivate — no developer needed)
- Booking management:
  - View all bookings with participant count, payment status, and experience details
  - Cancel bookings and initiate refunds via Razorpay
- Blog moderation:
  - Approve or reject submitted blogs
  - Provide rejection reason to the author
- Basic audit trail of key admin actions (bookings, cancellations, approvals)
- Admin receives email + SMS on every new confirmed booking

### 10.5 Legal Pages (Mandatory for V1)

Required because real payments are being taken from real users.

| Page                         | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| Terms & Conditions           | User agreement, usage rules, liability                      |
| Privacy Policy               | How user data is collected, stored, and used                |
| Cancellation & Refund Policy | Rules for cancellations, refund timelines, admin discretion |

All three pages must be live **before** the platform accepts real payments.  
Content to be written by the business. Pages must be linked in the site footer on every page.

### 10.6 Analytics

- Google Analytics integrated from launch
- Tracks page views, experience views, booking funnel, and traffic sources
- No additional analytics tool in V1

---

## 11. Platform & Device Requirements

**The entire platform must be mobile-first.**

This is a non-negotiable product requirement. The majority of users will access Param Adventures from a mobile browser.

| Surface                              | Mobile Requirement                           |
| ------------------------------------ | -------------------------------------------- |
| Experience listings                  | ✅ Fully mobile optimized                    |
| Experience detail pages              | ✅ Fully mobile optimized                    |
| Booking flow including group booking | ✅ Fully functional on mobile                |
| Razorpay payment                     | ✅ Mobile-friendly (native Razorpay support) |
| User dashboard                       | ✅ Mobile optimized                          |
| Blog reading and writing             | ✅ Mobile optimized                          |
| Contact and enquiry forms            | ✅ Mobile optimized                          |
| Admin panel                          | ✅ Usable on mobile, not just desktop        |
| Legal pages                          | ✅ Mobile optimized                          |

**Design principle:** Design mobile screens first, then scale up to tablet and desktop. Never the other way around.

**No native app in V1.** The mobile browser experience is the product. A native iOS/Android app is a post-V1 consideration.

---

## 12. Security Standards (V1)

- Email verification required before a user can complete their first booking
- Sessions have explicit expiry — inactive users are logged out automatically
- Passwords are never stored in plaintext
- Authorization checks are enforced server-side — never client-side only
- Users can only access their own bookings and payment data
- Payment records are immutable after completion
- All admin actions are audit logged with actor, action, timestamp, and target

---

## 13. V1 Explicit Exclusions

The following are intentionally out of scope for V1. Not forgotten — deferred.

| Feature                                   | Deferred To              |
| ----------------------------------------- | ------------------------ |
| Content Uploader / Approver roles         | V2                       |
| Corporate-specific booking flows          | V2                       |
| Self-service booking cancellation by user | V2 (admin-handled in V1) |
| Waiting list                              | V2                       |
| Corporate-specific booking flows          | V2                       |
| Multi-language support                    | V2                       |
| WhatsApp notifications                    | V2                       |
| Admin capacity override                   | V2                       |
| Flat group pricing                        | V2                       |
| Native mobile app                         | Post-V1                  |
| Discount and coupon system                | Post-V1                  |
| Recommendation engine                     | Post-V1                  |

---

## 14. Success Criteria

V1 is successful when all of the following are true:

| Area          | Definition of Success                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| Technical     | Clean layered codebase, fully documented, stable on AWS                                    |
| Product       | Users can browse, book individually or as a group, and pay on any device without confusion |
| Capacity      | System never allows overbooking under any condition                                        |
| Business      | 20 live experiences active, bookings processing reliably with Razorpay                     |
| Notifications | Every key event triggers email and SMS without failure                                     |
| Legal         | All three legal pages live before first real payment is accepted                           |
| SEO           | Sitemap, robots.txt, and meta tags present at launch                                       |
| Analytics     | Google Analytics tracking from day one                                                     |
| Operations    | Admin can manage experiences, categories, bookings, and content without developer help     |
| Quality       | No critical bugs or security issues in production at launch                                |

---

## 15. Document Version History

| Version | Changes                                                                                                                                                                                                                                                                                   | Date     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| v1.0    | Initial PRD — vision, users, features, exclusions                                                                                                                                                                                                                                         | Feb 2026 |
| v1.1    | Dynamic categories, email + SMS notifications, notification trigger matrix, admin notifications                                                                                                                                                                                           | Feb 2026 |
| v1.2    | Mobile-first as non-negotiable platform requirement across all surfaces                                                                                                                                                                                                                   | Feb 2026 |
| v1.3    | Group booking, per-person pricing, fixed + flexible scheduling, strict capacity enforcement, legal pages (T&C, Privacy Policy, Cancellation & Refund), Google Analytics, social sharing, sitemap and robots.txt, email verification on signup, session expiry, security standards section | Feb 2026 |

---

**Status: Awaiting Approval**

Reply with:

- ✅ Approved — lock it and move to Document 2: Roles & Access Control
- ✅ Approved with changes — list what to change
- ❌ Needs rework — explain why
