import { describe, it } from "vitest";
import * as Module from "@/lib/AuthContext";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/AuthContext.tsx", () => {
  it("renders", () => smokeTestReact(Module, "lib/AuthContext.tsx"));
});
