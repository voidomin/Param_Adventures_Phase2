import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/manager/trips/[id]/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/manager/trips/[id]/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/manager/trips/[id]/page.tsx"));
});
