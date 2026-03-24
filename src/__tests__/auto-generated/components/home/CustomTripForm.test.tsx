import { describe, it } from "vitest";
import * as Module from "@/components/home/CustomTripForm";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/home/CustomTripForm.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/home/CustomTripForm.tsx"));
});
