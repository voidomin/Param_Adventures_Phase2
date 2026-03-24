import { describe, it } from "vitest";
import * as Module from "@/app/login/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/login/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/login/page.tsx"));
});
