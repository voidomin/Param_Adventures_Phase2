# Sentry Error Reporting Guide

Param Adventures uses **Sentry** for real-time error tracking and performance monitoring. While many errors are captured automatically, this guide explains how to manually report errors and add context for faster debugging.

---

## 1. Standardized Reporting Utility

The project provides a centralized wrapper in `src/lib/monitoring.ts` that respects a database-level "Kill Switch" (`sentry_enabled`). **Always use this** instead of calling `Sentry.captureException` directly to ensure consistency and prevent quota abuse.

### Importing the Logger
```typescript
import { logError } from "@/lib/monitoring";
```

## 2. Basic Usage

### Capturing an Error (in `try-catch`)
```typescript
try {
  const data = await fetchData();
} catch (error) {
  // Capture the full error object
  await logError(error);
}
```

### Capturing a Manual Message
```typescript
if (!user.email) {
  // Capture a simple string message
  await logError("User missing email in profile session");
}
```

## 3. Adding Context

You can pass a second argument as a context object. This is invaluable for debugging because it shows exactly what data was being processed when the error happened.

```typescript
try {
  await prisma.user.update({ where: { id: userId }, data });
} catch (error) {
  await logError(error, { 
    userId, 
    source: "UserAccountUpdate",
    payloadLength: JSON.stringify(data).length 
  });
}
```

## 4. Enrichment (Tags & User)

If you need to add persistent data (like the logged-in user's ID) to all subsequent errors in a session:

### Setting the User (Client-side)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.setUser({ id: "123", email: "admin@example.com" });
```

### Adding a Custom Tag
Tags are searchable in the Sentry dashboard (e.g., you can filter for all errors where `environment: staging`).
```typescript
Sentry.setTag("feature_area", "checkout");
```

---

## 5. Standard Sentry Hooks

Next.js automatically captures:
- **Client-side Exceptions**: Any React rendering error or unhandled promise rejection.
- **Server Actions Errors**: Any error thrown inside a `'use server'` function.
- **API Support**: 500 errors in API routes (if wrapped or if using the Sentry SDK).

## 6. Runtime Control

The `logError` utility checks the `PlatformSetting` table for the `sentry_enabled` key. 
- If `sentry_enabled` = `false`, errors are only logged to the server console (`console.warn`) and **NOT** sent to Sentry.
- This allows the Admin team to disable Sentry manually via the Command Center if quota limits are reached.

---

## Testing Your Setup

To verify Sentry is working, visit the built-in debug endpoint:
`https://your-domain.com/api/debug-sentry` (requires admin session)
