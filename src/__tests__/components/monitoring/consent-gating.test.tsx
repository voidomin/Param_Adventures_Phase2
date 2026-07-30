import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieGet })),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/db-utils", () => ({
  withBuildSafety: vi.fn((fn: () => unknown) => fn()),
}));
vi.mock("./GoogleAnalyticsTracker", () => ({ default: () => null }));

import { prisma } from "@/lib/db";
import GoogleAnalytics from "@/components/monitoring/GoogleAnalytics";
import MetaPixel from "@/components/monitoring/MetaPixel";
import MicrosoftClarity from "@/components/monitoring/MicrosoftClarity";

const mockFindUnique = vi.mocked(prisma.platformSetting.findUnique);

describe("Analytics consent gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Otherwise-fully-configured and enabled -- the only variable under
    // test is the consent cookie.
    mockFindUnique.mockImplementation((async ({ where }: any) => {
      const values: Record<string, string> = {
        google_analytics_id: "G-TEST123",
        google_analytics_enabled: "true",
        meta_pixel_id: "1234567890",
        meta_pixel_enabled: "true",
        microsoft_clarity_id: "abcdefghij",
        microsoft_clarity_enabled: "true",
      };
      const value = values[where.key];
      return value ? { key: where.key, value } : null;
    }) as any);
  });

  describe("without consent", () => {
    beforeEach(() => {
      mockCookieGet.mockReturnValue(undefined);
    });

    it("GoogleAnalytics renders nothing", async () => {
      const { container } = render(await GoogleAnalytics());
      expect(container).toBeEmptyDOMElement();
    });

    it("MetaPixel renders nothing", async () => {
      const { container } = render(await MetaPixel());
      expect(container).toBeEmptyDOMElement();
    });

    it("MicrosoftClarity renders nothing", async () => {
      const { container } = render(await MicrosoftClarity());
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("with rejected consent", () => {
    beforeEach(() => {
      mockCookieGet.mockReturnValue({ value: "rejected" });
    });

    it("GoogleAnalytics renders nothing", async () => {
      const { container } = render(await GoogleAnalytics());
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("with accepted consent", () => {
    beforeEach(() => {
      mockCookieGet.mockReturnValue({ value: "accepted" });
    });

    // next/script doesn't inject a literal <script> synchronously outside
    // Next's own render pipeline, so these assert on the returned element
    // itself (not null / not a bail-out) rather than jsdom output.
    it("GoogleAnalytics does not bail out", async () => {
      const result = await GoogleAnalytics();
      expect(result).not.toBeNull();
    });

    it("MetaPixel does not bail out", async () => {
      const result = await MetaPixel();
      expect(result).not.toBeNull();
    });

    it("MicrosoftClarity does not bail out", async () => {
      const result = await MicrosoftClarity();
      expect(result).not.toBeNull();
    });
  });
});
