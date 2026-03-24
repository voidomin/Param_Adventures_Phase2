import { describe, it } from "vitest";
import * as Module from "@/app/privacy/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/privacy/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/privacy/page.tsx"));
});
