import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { redirectPlatformDefaultDomain } from "@/proxy";

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
