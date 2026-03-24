import { describe, it } from "vitest";
import * as Module from "@/components/home/Testimonials";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/home/Testimonials.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/home/Testimonials.tsx"));
});
