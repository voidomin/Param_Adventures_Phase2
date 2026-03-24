import { describe, it } from "vitest";
import * as Module from "@/app/forgot-password/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/forgot-password/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/forgot-password/page.tsx"));
});
