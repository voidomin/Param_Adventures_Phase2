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

- [ ] **Slot Management**: Capacity-aware scheduling — fixed date batches (e.g., "June 14–20, 2025") with seat limits.
- [x] **Checkout Flow**: Razorpay integration for secure group bookings with payment confirmation.
- [x] **User Dashboard**: Booking history, upcoming trips, and profile management for logged-in users.

## 🔜 Milestone 4b: Operations & Content

- [ ] **Operational Tools**: Trip Lead assignments and participant manifest lists.
- [x] **Blog System**: SEO-friendly article CMS with admin moderation.
- [ ] **Notification Engine**: Automated Email (SES) and SMS triggers on booking events.

## 🔜 Milestone 5: Polishing & Launch

- [ ] **SEO & Legal**: Finalize metadata, sitemaps, robots.txt, and legal pages (T&C, Privacy).
- [ ] **Pre-Launch Audit**: Security checks, audit logging verification, and load testing.
- [ ] **Production Deployment**: Final push to AWS and client handover.
