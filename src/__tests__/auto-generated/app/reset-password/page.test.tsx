import { describe, it } from "vitest";
import * as Module from "@/app/reset-password/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/reset-password/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/reset-password/page.tsx"));
});
