import { describe, it } from "vitest";
import * as Module from "@/app/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/page.tsx"));
});
