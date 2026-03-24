import { describe, it } from "vitest";
import * as Module from "@/components/auth/AestheticOverlays";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/auth/AestheticOverlays.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/auth/AestheticOverlays.tsx"));
});
