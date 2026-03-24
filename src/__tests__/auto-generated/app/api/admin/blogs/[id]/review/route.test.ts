import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/admin/blogs/[id]/review/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/admin/blogs/[id]/review/route"));
});
