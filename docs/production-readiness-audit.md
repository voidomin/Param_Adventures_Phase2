# Production Readiness Audit & Release Plan

**Audit revision: v3** (rounds: 2026-07-28 initial pass → re-verification pass → deep pass on auth completeness/env separation, same day)
**Current app version:** `1.0.2`

Full-app pass across security, compliance, performance, testing, accessibility, booking/payment correctness, and tech debt. Supersedes the stale items in `docs/todo.md` (which still claims no cancellation/refund endpoint exists — it does now).

Rather than fixing items 5–10 at a time in priority order, this plan groups everything into six shippable releases by **effort, risk, and dependency** — each release is a coherent, testable unit rather than a grab-bag. Work through releases in order; within a release, order doesn't matter much.

## How to use

- Ship one release at a time. Each has its own PR(s), its own test pass, its own deploy.
- Check items off as they land; note the commit/PR like `docs/bugs.md` does.
- If something turns out to already be fine on closer look, mark `Won't Fix` with a one-line reason instead of deleting the row.
- This is a living document — each audit round is appended to the revision note above, not silently overwritten, so we can see what's been re-checked and when.

---

## Release 1 — `v1.1.0` Correctness Hotfixes

Small, isolated, backend-only fixes. No schema changes, no new UI, low regression risk. Ship this first and fastest.

- [x] **Logout doesn't revoke the session.** `src/app/api/auth/logout/route.ts` only clears cookies — never increments `tokenVersion`. A stolen access/refresh token stays valid until it naturally expires even after the user logs out. (Nuance: `tokenVersion` *is* already bumped on password change and on admin role changes — there's just no standalone "revoke session" step wired into the logout button itself.) Fix: increment `tokenVersion` in the logout handler too. — **Fixed**: added `revokeSessionFromToken()` in `src/lib/auth.ts` (decodes the refresh/access token ignoring expiry, bumps `tokenVersion`, silently no-ops on a missing/invalid token) and wired it into the logout route.
- [x] **Admin "delete booking" can silently leak a seat, with no guard at all.** `DELETE /api/admin/bookings/[id]/route.ts` fetches only `{ id: true }` — it doesn't even check the booking's status before soft-deleting it. A `CONFIRMED` booking can be archived directly from the admin panel with zero effect on `remainingCapacity`, permanently short-changing that slot's inventory even though the seat is actually free. Fix: either block deleting a `CONFIRMED` booking outright (force admins through the existing cancel/refund flow, which does restore capacity), or restore capacity inline on delete. — **Fixed**: now blocks deletion of a `CONFIRMED` booking with a 409, directing admins through the existing cancel/refund flow instead.

---

## Release 2 — `v1.2.0` Account Security & Auth Completeness

Everything here touches the login/register/admin-auth path — bundled for one coordinated QA pass instead of several. Grew from 2 items to 6 after a deeper pass specifically on authentication.

- [ ] **No email verification.** `User.isVerified` defaults `false` on the schema, but nothing sends a verification email and nothing checks the flag at login — there is no verification-sending infrastructure anywhere in the codebase, not just an unenforced check. Anyone can register with an email they don't own and use the app immediately.
- [ ] **No admin 2FA / IP allowlisting.** SUPER_ADMIN and staff accounts — full access to customer PII and payment data — are password-only, with no MFA and no network restriction on `/admin`. This is the single account tier most worth hardening further.
- [ ] **No Google Sign-In, despite a schema column reserved for it.** `User.googleId` exists in the database (`prisma/schema.prisma:46`, marked `@unique`) and `docs/data-schema.md` explicitly labels it *"For Google OAuth (future)"* — but no OAuth flow was ever built: no callback route, no client-ID wiring, no "Continue with Google" button on login/register. This is a genuine missing feature, not just hardening — social login is a standard, low-friction expectation for a consumer booking app in 2026, and it would also sidestep the email-verification gap above (Google-verified emails are trustworthy by construction).
- [ ] **No per-account brute-force lockout.** Login attempts are throttled only by IP address (`authLimiter`, 20/min) — there is no counter tied to the target *email*, and no account lockout after N failed attempts. An attacker distributing login attempts across many IPs (or simply spoofing the `x-forwarded-for` header, which the rate limiter trusts as-is) faces zero per-account protection.
- [ ] **No password complexity requirement.** Both registration and password-reset only enforce a minimum length of 8 characters (`z.string().min(8, ...)`) — no character-variety requirement. A password like `"aaaaaaaa"` is currently accepted.
- [ ] **No admin session idle timeout.** Admin/staff sessions use the same JWT expiry as regular customer sessions, with no shorter-lived token and no client-side inactivity auto-logout for the highest-privilege account tier — worth a stricter timeout given what admin accounts can access.

---

## Release 3 — `v1.3.0` Compliance & Observability

None of these touch booking/payment logic — safe to batch together and ship independently of Releases 1–2.

- [ ] **No cookie-consent banner, and analytics scripts fire unconditionally without one.** `registerSchema` also has no `termsVersion`/`acceptedTermsAt` capture at signup. Worse than a missing banner alone: `src/app/layout.tsx` renders Google Analytics, Meta Pixel, and Microsoft Clarity unconditionally on every page load once enabled in admin settings — `GoogleAnalytics.tsx` even *defaults to enabled* if its settings row doesn't exist. So today, personal browsing data is sent to three third-party trackers for every visitor with zero consent gate. Relevant to India's DPDP Act and IT Rules, and also makes the refund/cancellation policy harder to enforce contractually without a recorded agreement.
- [ ] **No public disclosure of the registered legal entity name or GSTIN.** The site footer shows an office address and support contact, but no legal entity name (the footer/copyright uses only the brand name) and no GSTIN anywhere on the public site (footer or `/contact`). GSTIN is only entered as an optional admin setting and, if filled in, surfaces on a post-purchase invoice PDF — never on the storefront itself. India's Consumer Protection (E-Commerce) Rules expect this kind of seller identity to be disclosed upfront, not just after checkout.
- [ ] **No retention/purge policy for audit logs or other non-account PII.** `AuditLog` rows accumulate indefinitely with no TTL and no purge job — separate from (and unaddressed by) the user-initiated account-deletion feature already built. DPDP's purpose-limitation principle expects data to be kept only as long as needed for its stated purpose.
- [ ] **No documented rollback procedure.** `docs/DEPLOYMENT.md` covers setup, deploy, and troubleshooting, but has no section on reverting a bad production deploy (e.g. Render's "redeploy previous" flow). Cheap to fix — this is a documentation task, not code.
- [ ] **Backup restore has never been tested.** We've confirmed Render's paid Postgres plan takes automated backups, but there's no documented restore drill anywhere — a backup that's never been test-restored is an assumption, not a guarantee.
- [ ] **Sentry isn't called from any API route.** Wired into React error boundaries only. Server-side failures (webhook errors, payment errors) are `console.error`-only — no alert when something breaks in production.
- [ ] **`/api/health` isn't wired to any external monitor.** Real DB check exists, but no UptimeRobot/Better Uptime config, no `healthCheckPath` in `render.yaml`. If the site goes down, nothing pages anyone.
- [ ] **No bounce/complaint handling for transactional email.** A bounced password-reset or booking-confirmation email fails silently — no retry, no alert.
- [ ] **No CAPTCHA/bot protection** on `/register`, leads, or quote forms — rate-limiting is the only defense against scripted abuse.

---

## Release 4 — `v1.4.0` Payments Decision + Performance

Opens with two things only the client/ops team can verify or decide — surfaced early so they don't block the rest of the release. The remaining items are independent scale/process hardening, safe to batch alongside them.

- [ ] **⚠️ Verify with ops: confirm Razorpay is running live keys, not test keys.** `docs/todo.md` still has "Switch Razorpay from test mode to live mode" unchecked. The code itself has no unsafe fallback (dummy keys are hard-gated to `development`/`test` environments only), so this is purely a matter of confirming which key string (`rzp_live_...` vs `rzp_test_...`) is actually configured in the production environment right now — a 30-second check, but worth confirming explicitly, since the consequence of missing it (no real payments actually processing) is severe.
- [ ] **⚠️ Verify with ops: staging and production database separation relies entirely on operator discipline, with no automated safeguard.** Deployment docs describe Render (staging/UAT) and AWS (production) as separate targets, each with its own manually-entered `DATABASE_URL` — but nothing in code prevents both being pointed at the same database by mistake (no environment-name assertion at boot, no DB-name check). Worth a quick confirmation that they are, in fact, separate today, and consider adding a boot-time guard.
- [ ] **⚠️ Decision needed: refunds are never automatically sent back via Razorpay.** When a customer cancels a paid booking, the system correctly computes the refund and restores slot capacity — but settlement is 100% manual: an admin either issues internal `TravelCoupon` credit or hand-records a UTR for a bank transfer. No `razorpay.payments.refund()` call exists anywhere. Confirm with the client whether this is intentional (may be, per earlier "awaiting business logic" notes) before scoping this as either "leave as-is, documented" or "build gateway-initiated refund automation."
- [ ] **Public + admin experiences lists have no pagination.** Both load the entire table on every request. Fine at current catalog size, will not stay fine.
- [ ] **Missing composite DB index for the abandoned-booking cleanup query.** It filters `bookingStatus + paymentStatus + createdAt` together but only single-column indexes exist. Add `@@index([bookingStatus, paymentStatus, createdAt])`.
- [ ] **No CI step validates migrations before deploy.** `render.yaml`'s `preDeployCommand` runs `prisma migrate deploy` directly against production with no dry-run/diff gate first.
- [ ] **No E2E tests.** No Playwright/Cypress setup exists. Unit/integration coverage is otherwise strong (1359 tests, all major feature areas covered).
- [ ] **Staging config lives outside version control.** Only one `render.yaml` in-repo (production blueprint); parity risk if staging drifts unnoticed.
- [ ] **Double-submit on "Pay Now" has no formal idempotency key.** Current protection (UI state swap + server-side superseding of prior pending bookings) works, but a fast double-click could still start two Razorpay orders before the button visually disables.
- [ ] **Generic user uploads (avatar, review photos) aren't compressed client-side**, unlike admin-uploaded trip images.

---

## Release 5 — `v1.5.0` UX & Accessibility Polish

Lowest risk, most visible to end users, no urgency — good candidate for a quiet release between feature work.

- [ ] **Modals have no focus trap or Escape handling** (confirmed on the account-deletion modal, likely true elsewhere — worth a sweep).
- [ ] **Booking/payment page surfaces raw error text and uses native `alert()`** instead of the toast pattern used elsewhere in the app.
- [ ] **No loading skeleton for the experience detail page or any dashboard route** (admin already has good skeleton coverage; extend the same pattern here).
- [ ] **A few images have unintentional empty `alt=""`** — looks like an oversight, not deliberate.
- [ ] **No real-device mobile responsiveness testing** — stays a manual QA step, not CI-automatable.

---

## Backlog — cheap cleanup, no dedicated release needed

- [ ] Remove unused `cmdk` dependency (zero imports found in `src/`).
- [ ] Pin `xlsx` to a proper npm release instead of a CDN tarball.
- [ ] Tighten the ~4 non-test `any` usages in `src/lib/auth.ts` and the payment webhook route.

---

## Already confirmed fine (no action needed)

Custom 404/500 error pages, `robots.txt`/`sitemap.xml`, GST-compliant invoicing, refund audit trail (`RefundRequest` + `AuditLog`), CSRF protection, rate limiting, security headers (CSP/HSTS/etc.), CI lint+typecheck+test gate, DB connection pooling, ISR caching/revalidation, ~zero TODO/FIXME comments, no dead code, auth logic consistently centralized, concurrent-booking race protection (Serializable isolation on capacity decrement), manual-payment admin approval flow, coupon/credit reuse protection, abandoned-booking cleanup cron, DB backups (Render Postgres paid plan), self-service account deletion + data export (DPDP compliance), Razorpay webhook delivery-level deduplication (`ProcessedWebhookEvent` — verified wired in and working; an earlier pass in this audit incorrectly flagged it as dead code), dependency vulnerability scanning in CI (`npm audit --audit-level=high` genuinely fails the build on high/critical production-dependency issues on every push/PR; a secondary devDependency-inclusive scan on schedule/dispatch is informational-only, which is an acceptable tradeoff), **password-reset tokens are correctly single-use** (invalidated in the same transaction as the password change, with a `tokenVersion` bump on top — no reuse vulnerability).
