# Requirements - Param Adventure (v1)

## 1. Overview

Param Adventure is a travel and event platform specializing in pilgrimages, city tours, camping, and corporate events. The goal of Version 1 is to provide a user-friendly booking experience and a robust admin management system.

## 2. Target Audience

- **Travelers/Users**: People looking to discover and book adventures.
- **Admins**: Business owners managing events, content, and bookings.
- **Trip Leads**: Operational staff assigned to lead specific trips.

## 3. Core Features (Scope for v1)

### User Side

- **Event Discovery**: Professional landing page with dynamic filtering for tour types.
- **SEO Optimized Pages**: Individual event pages designed for search engine visibility.
- **Booking Flow**: Ability to book trips with user registration/login.
- **Theme Support**: Dark (Black) and Light modes with Saffron highlights.

### Admin Side

- **Event Management (CRUD)**: Create, update, and deletion of events including images and rich text content.
- **RBAC (Role-Based Access Control)**: Admins vs. Users vs. Trip Leads.
- **User Management**: View and manage customer data and bookings.
- **Operational Cycle**: Assigning Trip Leads to specific departures.
- **Communications**: Automated email/message notifications for bookings.

## 4. Technical Non-Functional Requirements

- **Performance**: High speed and optimal performance on AWS.
- **Visuals**: Premium UI with Black/Saffron color scheme.
- **Scalability**: Architecture that can grow beyond Phase 2.

## 5. User Journey & Experience

### 5.1 Home Page Layout (Hero to Footer)

- **Hero Section**: Immersive high-resolution media (Video/Image) with a clear Saffron CTA: "Explore All Adventures".
- **Dynamic Category Bar**: Clean, horizontal filter icons for categories like _Spiritual_, _Trekking_, and _Corporate_.
- **Featured Experience Grid**: Visual cards showing the title, price per person, difficulty badge, and "Filling Fast" status.
- **Story Section (Blogs)**: "Adventure Chronicles" – Previews of approved user blog posts to build trust and community.
- **Trust Indicators**: Brief highlights on safety, expert leads, and secure Razorpay integration.

### 5.2 The Booking Workflow (Step-by-Step)

1. **Selection**: User picks a trip and selects a specific **Slot** (Date) and the number of **Participants**.
2. **Authentication**: System checks if the user is logged in.
   - _Not Logged In_: Quick registration via Clerk (Social or Email). **Verification is mandatory** for the first booking.
3. **Review**: A summary modal shows the breakdown: `Price per Person` × `Participants` = `Total Total`.
4. **Capacity Logic**: System double-checks the database in real-time to ensure spots haven't been taken in the last few seconds.
5. **Payment (Razorpay)**: The user initiates payment. The platform stays in a "Pending" state.
6. **Completion**: Upon successful payment via Razorpay Webhook:
   - Capacity is permanently reduced.
   - Booking status flips to **Confirmed**.
   - **Notifications**: Automated Saffron-themed Email + SMS sent to the User and Admin.
