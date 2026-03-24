import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/sitemap.ts", () => {
  it("imports", () => smokeTestModule("@/app/sitemap"));
});
