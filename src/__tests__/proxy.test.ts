import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy, { redirectPlatformDefaultDomain, CRON_ENDPOINT_PREFIXES } from "@/proxy";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

const requestTo = (host: string, path = "/experiences/kodachadri-trek?ref=ig") =>
  new NextRequest(`https://${host}${path}`, { headers: { host } });

describe("redirectPlatformDefaultDomain", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.paramadventures.in";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("redirects an onrender.com host to the canonical domain, preserving path and query", () => {
    const response = redirectPlatformDefaultDomain(requestTo("param-adventures-web.onrender.com"));

    expect(response).not.toBeNull();
    expect(response!.status).toBe(301);
    expect(response!.headers.get("location")).toBe(
      "https://www.paramadventures.in/experiences/kodachadri-trek?ref=ig",
    );
  });

  it("does nothing for the real custom domain", () => {
    const response = redirectPlatformDefaultDomain(requestTo("www.paramadventures.in"));
    expect(response).toBeNull();
  });

  it("does nothing when NEXT_PUBLIC_APP_URL is unset, to avoid redirecting to an empty host", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const response = redirectPlatformDefaultDomain(requestTo("param-adventures-web.onrender.com"));
    expect(response).toBeNull();
  });

  it("does not loop when NEXT_PUBLIC_APP_URL is itself misconfigured to an onrender.com URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://param-adventures-web.onrender.com";
    const response = redirectPlatformDefaultDomain(requestTo("param-adventures-web.onrender.com"));
    expect(response).toBeNull();
  });

  it("does nothing for an unrelated host", () => {
    const response = redirectPlatformDefaultDomain(requestTo("some-other-app.onrender.com"));
    // Still an onrender.com host, so it SHOULD redirect -- this test documents
    // that the check is host-suffix-based, not tied to one specific service name.
    expect(response).not.toBeNull();
    expect(response!.headers.get("location")).toContain("www.paramadventures.in");
  });
});

describe("cron endpoints: CSRF and accessToken exemptions stay in sync", () => {
  // Regression test for a real bug: /api/admin/bookings/send-balance-reminders
  // was added to the CSRF exemption list but not to publicPaths (the
  // accessToken cookie gate), so the cron caller -- no browser Origin
  // header, no session cookie -- got a 401 from this proxy on every single
  // scheduled run, never reaching the route's own x-cron-secret check.
  // Both lists are now derived from one shared array (CRON_ENDPOINT_PREFIXES);
  // this test calls the actual proxy for every entry in it and fails if
  // either exemption is missing for any of them.
  it.each(CRON_ENDPOINT_PREFIXES)(
    "allows an unauthenticated, cookie-less POST through to %s",
    async (path) => {
      const request = new NextRequest(`https://www.paramadventures.in${path}`, {
        method: "POST",
        headers: { host: "www.paramadventures.in" },
      });

      const response = await proxy(request);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    },
  );
});
