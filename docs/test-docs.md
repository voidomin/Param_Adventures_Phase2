# Test Documentation & QA Plan

This document defines the testing strategy and tracks all test cases for **Param Adventure v1**.

## Testing Strategy

### Levels of Testing

| Level            | Tool                | What We Test                                    | When                  |
| ---------------- | ------------------- | ----------------------------------------------- | --------------------- |
| **Manual UI**    | Browser (localhost) | Visual layout, responsiveness, user flows       | After every feature   |
| **API Testing**  | Browser / Postman   | API routes return correct data and status codes | After every API route |
| **Build Check**  | `npm run build`     | No TypeScript errors, clean production build    | Before every commit   |
| **Lint Check**   | `npm run lint`      | Code quality, unused imports, style consistency | Before every commit   |
| **E2E (future)** | Playwright          | Full user flows (sign up → book → pay)          | Before release        |

### Pre-Commit Checklist

Before every `git commit`, verify:

- [ ] `npm run build` passes with zero errors
- [ ] Page loads correctly on `localhost:3000`
- [ ] Mobile responsive layout checked (Chrome DevTools)
- [ ] No console errors in browser
- [ ] All changed files are linted

### Bug Workflow

1. **Find a bug** → Add to `docs/bugs.md` with priority and steps to reproduce
2. **Fix the bug** → Reference the `BUG-XXX` ID in the commit message
3. **Verify the fix** → Test locally, then move bug to "Closed" in `bugs.md`

---

## Test Cases

### 1. Authentication & RBAC

- [ ] **TC-01**: User can register with email/password.
- [ ] **TC-02**: User receives verification email and cannot book until verified.
- [ ] **TC-03**: Role enforcement: User cannot access Admin Dashboard routes.
- [ ] **TC-04**: Role enforcement: Trip Manager can assign Trek Leads but cannot see financial details.

### 2. Content Management

- [ ] **TC-05**: Admin can create a new Experience with images and fixed-date slots.
- [ ] **TC-06**: Dynamic Categories: New category added in Admin appears in Home Page filters.
- [ ] **TC-07**: Archive Logic: Archived experiences do not appear in the public discovery grid.

### 3. Booking & Payment Workflow

- [ ] **TC-08**: Group Booking: Total price = `Price per Person` × `Participants`.
- [ ] **TC-09**: Capacity Check: System blocks booking if participants > remaining capacity.
- [ ] **TC-10**: Razorpay Webhook: Booking status switches to "Confirmed" upon payment success.
- [ ] **TC-11**: Notification Loop: User and Admin receive SMS/Email on successful booking.

### 4. Operational Tests

- [ ] **TC-12**: Trek Lead can view participant list only for their assigned trip.
- [ ] **TC-13**: Attendance Marking: Trek Lead can mark a participant as present.
- [ ] **TC-14**: Expense Upload: Trek Lead can upload a receipt; Trip Manager can view it.

### 5. UI & Performance

- [ ] **TC-15**: Mobile Responsiveness: Landing page and Booking flow work on iPhone/Android.
- [ ] **TC-16**: SEO: Meta tags and Title tags are correctly injected for each experience page.
- [ ] **TC-17**: Dark Mode: The Saffron highlights work correctly on Obsidian Black backgrounds.
- [ ] **TC-18**: Logo displays correctly as favicon and navbar icon.
- [ ] **TC-19**: Navbar is sticky, responsive, and mobile hamburger menu works.
- [ ] **TC-20**: Hero section animation loads smoothly without jank.
