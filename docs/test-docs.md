# Test Documentation & QA Plan

This document tracks all manual and automated test cases to ensures **Param Adventure v1** meets the successful criteria defined in the PRD.

## 1. Authentication & RBAC

- [ ] **TC-01**: User can register with email/password.
- [ ] **TC-02**: User receives verification email and cannot book until verified.
- [ ] **TC-03**: Role enforcement: User cannot access Admin Dashboard routes.
- [ ] **TC-04**: Role enforcement: Trip Manager can assign Trek Leads but cannot see financial details.

## 2. Content Management

- [ ] **TC-05**: Admin can create a new Experience with images and fixed-date slots.
- [ ] **TC-06**: Dynamic Categories: New category added in Admin appears in Home Page filters.
- [ ] **TC-07**: Archive Logic: Archived experiences do not appear in the public discovery grid.

## 3. Booking & Payment Workflow

- [ ] **TC-08**: Group Booking: Total price = `Price per Person` × `Participants`.
- [ ] **TC-09**: Capacity Check: System blocks booking if participants > remaining capacity.
- [ ] **TC-10**: Razorpay Webhook: Booking status switches to "Confirmed" immediately upon payment success.
- [ ] **TC-11**: Notification Loop: User and Admin receive SMS/Email on successful booking.

## 4. Operational Tests

- [ ] **TC-12**: Trek Lead can view participant list only for their assigned trip.
- [ ] **TC-13**: Attendance Marking: Trek Lead can mark a participant as present.
- [ ] **TC-14**: Expense Upload: Trek Lead can upload a receipt; Trip Manager can view it.

## 5. Performance & Mobile

- [ ] **TC-15**: Mobile Responsiveness: Landing page and Booking flow work flawlessly on iPhone/Android browsers.
- [ ] **TC-16**: SEO: Meta tags and Title tags are correctly injected for each experience page.
- [ ] **TC-17**: Dark Mode: The Saffron highlights work correctly on pure Obsidian Black backgrounds.
