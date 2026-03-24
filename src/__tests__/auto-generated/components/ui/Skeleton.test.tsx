import { describe, it } from "vitest";
import * as Module from "@/components/ui/Skeleton";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/ui/Skeleton.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/ui/Skeleton.tsx"));
});
