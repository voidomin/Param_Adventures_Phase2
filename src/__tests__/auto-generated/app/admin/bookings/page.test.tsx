import { describe, it } from "vitest";
import * as Module from "@/app/admin/bookings/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/bookings/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/bookings/page.tsx"));
});
