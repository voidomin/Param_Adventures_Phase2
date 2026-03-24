import { describe, it } from "vitest";
import * as Module from "@/components/booking/BookNowButton";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/booking/BookNowButton.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/booking/BookNowButton.tsx"));
});
