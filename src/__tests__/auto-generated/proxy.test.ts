import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: proxy.ts", () => {
  it("imports", () => smokeTestModule("@/proxy"));
});
