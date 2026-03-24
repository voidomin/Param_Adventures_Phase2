import { describe, it } from "vitest";
import * as Module from "@/app/experiences/[slug]/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/experiences/[slug]/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/experiences/[slug]/page.tsx"));
});
