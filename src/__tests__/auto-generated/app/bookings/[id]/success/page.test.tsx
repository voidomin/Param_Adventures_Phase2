import { describe, it } from "vitest";
import * as Module from "@/app/bookings/[id]/success/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/bookings/[id]/success/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/bookings/[id]/success/page.tsx"));
});
