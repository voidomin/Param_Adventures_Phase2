import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/wishlist/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/wishlist/route"));
});
