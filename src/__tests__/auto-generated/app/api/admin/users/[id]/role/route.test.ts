import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/admin/users/[id]/role/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/admin/users/[id]/role/route"));
});
