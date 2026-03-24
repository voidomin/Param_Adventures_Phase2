import { describe, it } from "vitest";
import * as Module from "@/app/blog/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/blog/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/blog/page.tsx"));
});
