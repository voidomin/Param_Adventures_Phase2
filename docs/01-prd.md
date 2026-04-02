# Product Requirements Document (PRD)

**Product:** Param Adventures  
**Version:** 1.3.1 (Stable — Release Candidate)  
**Status:** Ready for Final UAT  
**Last Updated:** April 2, 2026

---

## 1. Product Identity

| Field             | Detail                                                |
| ----------------- | ----------------------------------------------------- |
| Product Name      | Param Adventures                                      |
| Product Type      | Multi-category outdoor & experiential events platform |
| Current Version   | V1.0.0-RC                                             |
| Payment Gateway   | Razorpay (UPI, Netbanking, Cards)                     |
| Target Region     | Pan-India                                             |
| Deployment Target | Render (Current Staging) / AWS (Future Production)    |

---

## 2. Product Vision

Param Adventures is a full-stack experiential events platform that organizes, markets, and manages real-world experiences — including treks, spiritual journeys, corporate outings, city walks, camping, educational trips, and more — through a single trusted digital platform.

The platform combines:

- Curated, categorized experience listings with fixed and flexible scheduling
- Group and individual booking with Razorpay payment
- Content-driven trust through blogs and storytelling
- Real-time email notifications (Resend/Zoho) to users and admins
- A fully mobile-first experience across every surface
- Integrated monitoring and performance tracking (Sentry + GA)

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

---

## 7. Experience Scheduling

Each experience supports one of two scheduling models:

| Scheduling Type       | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| Fixed-date slots      | Admin defines specific dates. Users book into an available slot. |
| Flexible / on-request | No fixed dates. User submits interest and admin confirms dates.  |

---

## 8. Capacity Management

- Every experience and every fixed-date slot has a **maximum participant capacity** set by admin.
- Capacity is **strictly enforced** — no overbooking is allowed.
- Group bookings reduce available capacity by the number of participants booked.
- When an experience or slot reaches full capacity it is automatically marked **Sold Out**.

---

## 9. Booking & Pricing

### Group Booking

- A single user can book for multiple participants in one transaction.
- Total price is calculated as: **price per person × number of participants**.

### Payment Flow

1. User selects experience and number of participants.
2. System checks capacity — if insufficient spots remain, booking is blocked.
3. Razorpay payment initiated.
4. On payment success → booking instantly confirmed, capacity reduced, notifications sent.
5. on payment failure → booking marked as failed, user notified, capacity not reduced.

---

## 10. V1 Feature Scope

### 10.1 Public (No Login Required)

- Browse all published experiences with dynamic category filtering.
- View full experience detail pages with itinerary, pricing, and images.
- Read published blog posts and stories.
- Submit contact and enquiry forms.
- All public pages are SEO-friendly with proper meta tags (Sitemap and Robots.txt included).

### 10.2 User Accounts

- Register and login securely via Custom JWT.
- View and manage personal profile and booking history.
- Complete payment via Razorpay.
- Write and submit blog posts for admin approval.

### 10.3 Notifications

All major events trigger Email notifications via **Resend** or **Zoho API**.

| Event                          | User Notified  | Admin Notified |
| ------------------------------ | -------------- | -------------- |
| Booking confirmed              | ✅ Email       | ✅ Email       |
| Booking cancelled              | ✅ Email       | ✅ Email       |
| Payment failed                 | ✅ Email       | —              |
| Blog approved                  | ✅ Email       | —              |

### 10.4 Admin Panel (Command Center)

- **Experience and Category Management**: Create, edit, and archive content.
- **Booking Management**: View all bookings, manage cancellations and refunds.
- **Role Management**: Control access via `SUPER_ADMIN`, `ADMIN`, `TREK_LEAD`, etc.
- **System Configuration**: Real-time updates for tax, payments, and media providers.

---

## 11. Monitoring & Analytics

- **Sentry**: Real-time error tracking and performance monitoring for server and client.
- **Google Analytics**: Integrated visitor tracking and conversion funnel analysis.

---

## 12. Success Criteria

V1 is successful when all of the following are true:

| Area          | Definition of Success                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Technical** | Stable on Render, Sentry reporting 0 critical issues, fully documented.                    |
| **Product**   | Users can complete group bookings on mobile without friction.                              |
| **Business**  | 20 live experiences active, payments processing reliably via Razorpay.                     |
| **Legal**     | Terms, Privacy, and Refund policies live and linked in footer.                             |

---

## 13. Document Version History

| Version | Changes                                                                                              | Date       |
| ------- | ---------------------------------------------------------------------------------------------------- | ---------- |
| v1.0    | Initial PRD — vision, users, features, exclusions                                                   | Feb 2026   |
| v1.3    | Group booking, legal pages, Google Analytics integration.                                            | Feb 2026   |
| v1.3.1  | Render deployment target, Sentry monitoring, Modular Command Center architecture, and Role Refactor. | April 2026 |

---

**Status: Ready for Final Review**
