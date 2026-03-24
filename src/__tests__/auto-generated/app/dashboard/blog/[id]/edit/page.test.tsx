import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/blog/[id]/edit/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/blog/[id]/edit/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/blog/[id]/edit/page.tsx"));
});
