## Overview

All `/api/*` routes are protected by an in-memory sliding window rate limiter, enforced via the Next.js proxy middleware (`src/proxy.ts`).

## Architecture

```
Request → proxy.ts → findMatchingRule() → rateLimit() → Route Handler
                              ↓                     ↓
                    rate-limit-config.ts      rate-limit.ts (in-memory store)
```

## Current Limits

| Tier        | Routes                                                             | Limit | Window |
| ----------- | ------------------------------------------------------------------ | ----- | ------ |
| 🔴 Critical | `/api/auth/login`, `register`, `forgot-password`, `reset-password` | 5     | 15 min |
| 🟠 High     | `/api/bookings`, `/api/leads`                                      | 10    | 1 min  |
| 🟢 Default  | All other `/api/*`                                                 | 60    | 1 min  |

Limits are **per IP address**. Each user gets their own independent counter.

## How to Add a New Rate Limit

Edit `src/lib/rate-limit-config.ts` and add a new entry to `RATE_LIMIT_RULES`:

```typescript
{
  pathPrefix: "/api/your-new-route",
  limit: 20,
  windowMs: 60 * 1000,
  label: "YourRoute",
},
```

> **Important**: Rules are matched first-match-wins. Place more specific paths **above** broader prefixes.

## Response Headers

Every API response includes:

| Header                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `X-RateLimit-Limit`     | Max requests allowed per window               |
| `X-RateLimit-Remaining` | Requests remaining in current window          |
| `Retry-After`           | Seconds until the window resets (only on 429) |

## Monitoring

Blocked requests are logged to the server console:

```
[RATE_LIMIT] Blocked 1.2.3.4 on /api/auth/login (Auth:Login). Retry after 892s
```

Search server logs for `[RATE_LIMIT]` to audit abuse attempts.

## Scaling to Redis

The current in-memory store works for a **single server** (e.g., one AWS instance). To scale to multiple instances:

1. Install Upstash Redis: `npm install @upstash/redis`
2. Replace the `Map`-based store in `rate-limit.ts` with Upstash's `Redis.incr()` + `Redis.expire()`.
3. No changes needed in `proxy.ts` or `rate-limit-config.ts`.
