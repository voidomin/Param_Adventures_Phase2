# Pending Credentials & Action Items

**As of:** 2026-07-29
**Branch:** `fix/release-1-correctness-hotfixes` (not yet merged to `main`)
**Context:** Release 2 (`v1.2.0`) and Release 3 (`v1.3.0`) shipped code for several optional integrations. The code is live and does nothing until each credential below is actually entered — nothing is silently active. This is the punch list of what's still needed from the client/ops side, split into (A) keys to obtain and enter, and (B) external setup steps that can't be done from the codebase.

---

## A. Keys to obtain and enter into Admin → Settings

| Integration | What to get | Where to get it | Where it goes | Cost |
|---|---|---|---|---|
| **Google Sign-In** | OAuth 2.0 Client ID (`....apps.googleusercontent.com`) | Google Cloud Console → APIs & Services → Credentials → Create OAuth Client ID (type: Web application) | Settings → Integrations → "Google Sign-In" | Free |
| **Cloudflare Turnstile** | Site Key + Secret Key (pair) | Cloudflare Dashboard → Turnstile → Add Site | Settings → Integrations → "Turnstile" | Free |
| **Resend Webhook** | Webhook Signing Secret (`whsec_...`) | Resend Dashboard → Webhooks → Add Endpoint (see step B2 below — the endpoint has to be created first) | Settings → Communications (shown when email provider = Resend) | Free |

**On hold:** Resend webhook secret is obtained and ready, but Zoho is the active email provider right now, so this stays parked — the webhook code only matters if/when Resend becomes the active provider. Enter it in Settings → Communications whenever that switch happens.

Each of these has a **"Test Connection"** button in the admin panel once entered, so you'll get an immediate pass/fail rather than finding out later that something was mistyped.

**Not needed anymore:** the Admin IP Allowlist that was briefly part of this list has been removed at the client's request (team works from mobile/travelling, so a static allowlist caused more lockout risk than security benefit). No key to collect there.

---

## B. External setup steps (can't be done from code)

1. **Uptime monitoring for `/api/health`.** Render uses this endpoint for its own deploy health checks already, but nothing currently pages a human if the site goes down outside of a deploy.
   - Sign up for **UptimeRobot** or **Better Uptime** (both have a free tier).
   - Add an HTTP(s) monitor pointed at `https://<production-domain>/api/health`, checked every 1–5 minutes, expecting a `200` status.
   - Add an email (and phone, if you want SMS/call escalation) so a failure reaches a person.

2. **Resend webhook endpoint** — **on hold, Zoho is the active provider.** The webhook signature-verification code is live, but Resend won't send anything until an endpoint is registered on their side, and none of this matters while Zoho is handling email. Revisit only if/when Resend becomes the active provider:
   - In the Resend Dashboard → Webhooks, add an endpoint pointed at `https://<production-domain>/api/webhooks/email`.
   - Copy the signing secret it gives you into Settings → Communications (see table above) — already in hand, just not entered since it's not needed yet.

---

## Status

- [ ] Google Sign-In Client ID entered and verified
- [ ] Turnstile Site + Secret Key entered and verified
- [x] Resend webhook signing secret obtained — **on hold**, not entered, since Zoho is the active provider
- [ ] Resend webhook endpoint registered in Resend dashboard — on hold, same reason
- [ ] Uptime monitor configured and alerting a real person

Update the checkboxes above as each is completed — this file is the single source of truth for what's outstanding on the credentials/ops side, separate from the code-level release tracking in `docs/production-readiness-audit.md`.
