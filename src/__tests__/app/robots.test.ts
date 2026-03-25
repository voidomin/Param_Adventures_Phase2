import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

describe("app/robots", () => {
  it("returns robots rules with sitemap url", () => {
    const result = robots();

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/dashboard"],
    });
    expect(String(result.sitemap)).toContain("/sitemap.xml");
  });
});
