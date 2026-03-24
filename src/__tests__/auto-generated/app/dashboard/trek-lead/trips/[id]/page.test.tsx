import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/trek-lead/trips/[id]/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/trek-lead/trips/[id]/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/trek-lead/trips/[id]/page.tsx"));
});
