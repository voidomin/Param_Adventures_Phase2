import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/lib/db";
import robots from "@/app/robots";

vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe("app/robots", () => {
  it("returns robots rules with sitemap url", async () => {
    const result = await robots();

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/dashboard"],
    });
    expect(String(result.sitemap)).toContain("/sitemap.xml");
  });

  it("uses BASE_URL from platform settings if available", async () => {
    vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([{ key: "app_url", value: "https://example.com" }] as any);
    
    const result = await robots();
    expect(result.sitemap).toBe("https://example.com/sitemap.xml");
  });
});
