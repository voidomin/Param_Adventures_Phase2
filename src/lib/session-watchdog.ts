/**
 * Detects a session that died out from under the user -- expired token,
 * revoked session, account deactivated mid-visit -- from ordinary API calls
 * made elsewhere in the app, and forces a clean logout instead of leaving
 * whatever component made the call to show a raw "Authentication required."
 * error (or nothing at all) on the next click.
 *
 * Deliberately narrow: only exact messages the backend uses specifically
 * for "your session is no longer valid" trigger it. Endpoints that reuse a
 * 401/403 for an ordinary wrong-input response (wrong password, wrong 2FA
 * code, wrong Google credential, a failed login attempt) are excluded by
 * path, since those must not force-logout an already-logged-in user who
 * simply mistyped something in an unrelated form.
 */

export const SESSION_INVALID_MESSAGES = new Set([
  "Authentication required.",
  "Invalid or expired token.",
  "Session expired. Please log in again.",
  "User not found or inactive.",
]);

export const SESSION_WATCHDOG_EXCLUDED_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/user/2fa/verify-setup",
  "/api/user/2fa/disable",
];

function resolvePathname(input: RequestInfo | URL): string | null {
  try {
    const url = typeof input === "string" || input instanceof URL ? input : input.url;
    return new URL(url, window.location.origin).pathname;
  } catch {
    return null;
  }
}

/**
 * Wraps window.fetch for the lifetime of the returned cleanup function.
 * Calls onSessionExpired() at most once per install -- callers doing a
 * fresh install (e.g. after a fresh login) get a fresh single-shot guard.
 */
export function installSessionWatchdog(onSessionExpired: () => void): () => void {
  const originalFetch = window.fetch;
  let handled = false;

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    if (!handled && (response.status === 401 || response.status === 403)) {
      const pathname = resolvePathname(args[0]);
      const isApiCall = pathname?.startsWith("/api/") ?? false;
      const isExcluded = SESSION_WATCHDOG_EXCLUDED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

      if (isApiCall && !isExcluded) {
        try {
          const data = await response.clone().json();
          if (data?.error && SESSION_INVALID_MESSAGES.has(data.error)) {
            handled = true;
            onSessionExpired();
          }
        } catch {
          // Non-JSON body -- not one of our session-invalid responses.
        }
      }
    }

    return response;
  };

  return () => {
    window.fetch = originalFetch;
  };
}
