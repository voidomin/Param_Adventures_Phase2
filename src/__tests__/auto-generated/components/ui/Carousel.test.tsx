import { describe, it } from "vitest";
import * as Module from "@/components/ui/Carousel";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/ui/Carousel.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/ui/Carousel.tsx"));
});
