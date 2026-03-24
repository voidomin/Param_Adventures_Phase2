import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/settings/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/settings/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/settings/page.tsx"));
});
