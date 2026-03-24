import { describe, it } from "vitest";
import * as Module from "@/components/home/CategoryBar";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/home/CategoryBar.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/home/CategoryBar.tsx"));
});
