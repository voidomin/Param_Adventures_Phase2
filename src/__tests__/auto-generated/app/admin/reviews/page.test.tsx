import { describe, it } from "vitest";
import * as Module from "@/app/admin/reviews/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/reviews/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/reviews/page.tsx"));
});
