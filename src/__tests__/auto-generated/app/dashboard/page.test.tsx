import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/page.tsx"));
});
