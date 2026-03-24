import { describe, it } from "vitest";
import * as Module from "@/app/admin/story/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/story/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/story/page.tsx"));
});
