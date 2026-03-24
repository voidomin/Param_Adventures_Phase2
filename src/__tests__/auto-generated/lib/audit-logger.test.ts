import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/audit-logger.ts", () => {
  it("imports", () => smokeTestModule("@/lib/audit-logger"));
});
