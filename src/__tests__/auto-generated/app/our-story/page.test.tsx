import { describe, it } from "vitest";
import * as Module from "@/app/our-story/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/our-story/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/our-story/page.tsx"));
});
