import { describe, it } from "vitest";
import * as Module from "@/app/dashboard/blog/write/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/dashboard/blog/write/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/dashboard/blog/write/page.tsx"));
});
