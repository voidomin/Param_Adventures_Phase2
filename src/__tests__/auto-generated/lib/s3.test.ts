import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/s3.ts", () => {
  it("imports", () => smokeTestModule("@/lib/s3"));
});
