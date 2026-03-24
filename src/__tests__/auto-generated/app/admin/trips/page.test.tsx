import { describe, it } from "vitest";
import * as Module from "@/app/admin/trips/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/trips/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/trips/page.tsx"));
});
