# Pre-Deployment To-Do List

# Pre-Deployment To-Do List

Everything that needs to be done after all feature implementations are complete, before the application goes live.

---

## 🔒 Security Hardening

- [x] **CORS Configuration** — Restrict API access to your domain (Phase 3 completion)
- [x] **Security Headers** — Added X-Frame-Options, CSP, etc via next.config.ts
- [x] **Input Sanitization** — XSS protection implemented for Blogs/Experiences
- [x] **Error Sanitization** — Global try/catch blocks ensure no stack traces in API
- [x] **Environment Variables Audit** — verified .env.example exists
- [x] **Cookie Security Audit** — httpOnly, secure, sameSite flags set
- [x] **SQL Injection Check** — Confirmed Prisma parameterized queries only
- [x] **File Upload Limits** — Added type and basic existence checks in API
- [x] Rate Limiting ✅ **Done** (Phase 22)

---

## 🌐 Domain & DNS

- [ ] **Point Zoho domain to AWS** — Add A/CNAME records in Zoho DNS pointing to your AWS server
- [ ] **SSL/HTTPS** — Set up free SSL certificate via Let's Encrypt (or AWS ACM if using CloudFront)
- [ ] **Force HTTPS** — Redirect all HTTP traffic to HTTPS via Nginx or middleware

---

## 📧 Email Setup

- [ ] **Zoho Mail** — Set up business email accounts (free for up to 5 accounts)
  - Add MX records in Zoho DNS
  - Create accounts like `hello@yourdomain.com`, `support@yourdomain.com`
- [ ] **Resend (Transactional Email)** — Verify your domain in Resend dashboard
  - Add SPF, DKIM, DMARC DNS records
  - Update `RESEND_API_KEY` in production env
  - Test: password reset, welcome email, booking confirmations

---

## 📱 SMS & OTP (If Needed)

- [ ] **Choose SMS Provider** — AWS SNS / MSG91 / Textlocal
- [ ] **DLT Registration** — Mandatory for commercial SMS in India
- [ ] **Sender ID Registration** — Register your brand name for SMS headers
- [ ] **Implement SMS Service** — Create `src/lib/sms.ts` utility
- [ ] **OTP Flow** — Decide if OTP-based login/verification is needed

---

## 🚀 AWS Hosting & Deployment

- [ ] **Choose AWS Service** — EC2 Free Tier / Lightsail / Amplify
- [ ] **Server Setup** — Install Node.js, Nginx, PM2 on the server
- [ ] **Database** — Set up PostgreSQL (Supabase/Neon free tier or self-hosted on EC2)
- [ ] **Nginx Reverse Proxy** — Configure Nginx to proxy requests to Next.js (port 3000)
- [ ] **PM2 Process Manager** — Set up PM2 to keep the app running and auto-restart on crash
- [ ] **Build & Deploy** — `npm run build` + `npm start` in production mode
- [ ] **Environment Variables** — Set all production env vars on the server
- [ ] **Auto-Deploy (Optional)** — Set up GitHub Actions for CI/CD

---

## 🗄️ Database & Backups

- [ ] **Database Migration** — Run `prisma migrate deploy` on production DB
- [ ] **Seed Data** — Run seed scripts for roles, permissions, and initial admin user
- [ ] **Automated Backups** — Set up daily DB backups (pg_dump cron job or managed DB snapshots)
- [ ] **Connection Pooling** — Configure Prisma connection pooling for production

---

## 🧪 Pre-Launch Testing

- [ ] **Full Feature Walkthrough** — Test every user flow (register → book → pay → review)
- [ ] **Mobile Responsiveness** — Test on actual phones (not just browser DevTools)
- [ ] **Performance** — Run Lighthouse audit, optimize images, check Core Web Vitals
- [x] **SEO** — Verify meta tags, Open Graph tags, sitemap, robots.txt ✅ **Done** (Phase 15)
- [ ] **Error Pages** — Ensure custom 404 and 500 pages are user-friendly
- [ ] **Payment Gateway** — Switch Razorpay from test mode to live mode

---

## 📊 Monitoring & Analytics (Post-Launch)

- [ ] **Error Tracking** — Set up Sentry or similar for production error monitoring
- [ ] **Analytics** — Add Google Analytics or Plausible for traffic tracking
- [ ] **Uptime Monitoring** — Set up UptimeRobot or AWS CloudWatch for downtime alerts
- [ ] **Log Management** — Configure structured logging for production debugging

---

## 🏗️ Phase 3: Immediate Security & Architecture Refinements (Post-Review)

Based on the final deep-dive architectural audit, these critical gaps need addressing before production:

- [x] **Global API Input Validation (Zod):** Implemented Zod schemas across mutation API routes.
- [x] **Next.js Cache Invalidation Flow:** Added `revalidatePath` and `revalidateTag` to mutations.
- [x] **UI Loading Skeletons:** Implemented "shimmer" loading states across all admin tables and card views.
- [x] **Server-Side HTML Sanitization (XSS Prevention):** Implemented `sanitize-html` for rich text.
- [x] **JWT Token Invalidation Strategy:** Implemented `tokenVersion` and updated login/verify flows.
- [ ] **Booking Cancellation Flow & Refunds:** Currently, no endpoint exists for a normal user to cancel a paid booking, automatically trigger a Razorpay refund, and restore slot capacity. Awaiting final client business logic for charges and flow.
- [x] **Manual Payment Acceptance:** Implement a flow for manual payments (bank transfer/UP/QR) when digital gateways are unavailable.
  - [x] User can fill booking details and select "Manual Payment". (Handled via admin/manual-verify endpoint for now)
  - [x] Admin dashboard interface to approve manual payments.
  - [x] Support for uploading/storing payment receipts or confirmation documents.
## 🧪 Phase 11: Manual Testing & Peer Review
- [ ] **Deploy to Vercel (Staging)**: Push a production-ready branch to Vercel for peer review.
- [ ] **Peer Testing Scenarios**:
  - [ ] **User Flow**: Register -> Forgot Password -> Login.
  - [ ] **Booking Flow**: Select Experience -> Pick Slot -> Pay (Test Mode).
  - [ ] **Admin Flow**: Update Auth Tagline -> Verify update on Login Page.
  - [ ] **Cancellation Flow**: User cancels -> Admin resolves refund -> Verify emails.
- [ ] **Device Lab**: Test on at least 3 physical devices (iPhone, Android, Desktop Safari).
- [ ] **Cross-Browser Verification**: Check layout consistency on Firefox and Edge.
