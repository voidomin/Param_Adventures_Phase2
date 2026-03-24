import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/manager/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/manager/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/manager/page.tsx"));
});
