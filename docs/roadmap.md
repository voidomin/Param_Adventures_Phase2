# Project Roadmap - Param Adventure v2

This roadmap outlines the path from planning to the production release of **Phase 2**.

## ✅ Milestone 1: The Foundation (Complete)

- [x] **Infrastructure Setup**: Next.js, Tailwind CSS, and Prisma initialized.
- [x] **Theme Implementation**: "Gold & Obsidian" Design System (Dark/Light modes).
- [x] **Authentication**: Custom JWT + Role-Based Access Control (RBAC) — 7 roles, 25 permissions.
- [x] **Database Migration**: Initial PostgreSQL schema deployed and seeded.
- [x] **Category Engine**: Admin panel to manage dynamic trip categories.

## ✅ Milestone 2: Core Management (Complete)

- [x] **Experience Builder**: Full CMS for creating/editing trips with itinerary, media, pricing.
- [x] **Media Library**: S3 integration with drag-and-drop uploader and admin gallery.
- [x] **Experience Publishing**: Quick Publish/Unpublish toggle on the admin list page.

## ✅ Milestone 3: Public Frontend & Hero CMS (Complete)

- [x] **Hero Slider Engine**: Admin panel to manage homepage Hero video/images with live preview.
- [x] **Featured Experiences**: Homepage shows a grid of featured, published trips.
- [x] **CategoryBar**: Infinite-scroll horizontal bar with left/right arrow navigation.
- [x] **Public Experiences Listing**: Grid showcasing trips with ExperienceCard component.
- [x] **Experience Detail Pages**: Rich pages showing itineraries (numbered Day 1/2/3), galleries, and pricing.

## 🔜 Milestone 4: Booking & Payments (Priority)

- [x] **Slot Management**: Capacity-aware scheduling — fixed date batches (e.g., "June 14–20, 2025") with seat limits.
- [x] **Checkout Flow**: Razorpay integration for secure group bookings with payment confirmation.
- [x] **User Dashboard**: Booking history, upcoming trips, and profile management for logged-in users.

## ✅ Milestone 4b: Operations & Content (Complete)

- [x] **Operational Tools**: Trip Lead assignments and participant manifest lists.
- [x] **Trip Lifecycle & D-Day**: App interface for Trek Leads to start/end trips on location.
- [x] **Manager Approvals**: Trip Manager review workflow for completed trips.
- [x] **Blog System**: SEO-friendly article CMS with admin moderation.
- [x] **Notification Engine**: Automated email notifications via Resend (Welcome, Bookings, Role updates, Trip completions) using React Email.

## ✅ Milestone 5: Reviews & Admin Infrastructure (Complete)

- [x] **Post-Trip User Reviews**: Eligible participants can leave 1-5 star ratings and reviews.
- [x] **Review Moderation & Display**: Public average rating on Experience pages.
- [x] **Admin Dashboard**: Central Hub for high-level metrics (Revenue, Bookings, Upcoming trips).
- [x] **System Audit Logs**: Real-time logging of critical system events (Roles, Trips, Bookings).

## 🔜 Milestone 6: Polishing & Launch (Next)

- [x] **SEO & Legal**: Dynamic OG/Twitter meta, sitemap.xml, robots.txt, Terms & Conditions, Privacy Policy, Footer.
- [ ] **Pre-Launch Audit**: Security checks, audit logging verification, and load testing.
- [ ] **Production Deployment**: Final push to AWS and client handover.
