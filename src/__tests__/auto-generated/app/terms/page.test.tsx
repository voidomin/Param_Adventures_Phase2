import { describe, it } from "vitest";
import * as Module from "@/app/terms/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/terms/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/terms/page.tsx"));
});
