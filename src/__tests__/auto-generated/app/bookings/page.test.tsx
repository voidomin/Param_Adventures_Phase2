import { describe, it } from "vitest";
import * as Module from "@/app/bookings/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/bookings/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/bookings/page.tsx"));
});
