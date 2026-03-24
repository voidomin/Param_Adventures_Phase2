import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/blog/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/blog/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/blog/page.tsx"));
});
