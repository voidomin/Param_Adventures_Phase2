import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/user/password/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/user/password/route"));
});
