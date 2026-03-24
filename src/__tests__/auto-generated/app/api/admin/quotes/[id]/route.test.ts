import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/admin/quotes/[id]/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/admin/quotes/[id]/route"));
});
