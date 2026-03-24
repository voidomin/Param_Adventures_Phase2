import { describe, it } from "vitest";
import * as Module from "@/app/admin/trips/[id]/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/trips/[id]/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/trips/[id]/page.tsx"));
});
