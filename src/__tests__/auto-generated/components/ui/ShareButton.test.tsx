import { describe, it } from "vitest";
import * as Module from "@/components/ui/ShareButton";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/ui/ShareButton.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/ui/ShareButton.tsx"));
});
