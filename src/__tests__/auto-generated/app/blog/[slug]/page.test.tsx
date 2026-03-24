import { describe, it } from "vitest";
import * as Module from "@/app/blog/[slug]/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/blog/[slug]/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/blog/[slug]/page.tsx"));
});
