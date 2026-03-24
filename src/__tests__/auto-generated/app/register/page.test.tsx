import { describe, it } from "vitest";
import * as Module from "@/app/register/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/register/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/register/page.tsx"));
});
