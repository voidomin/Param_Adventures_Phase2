import { describe, it } from "vitest";
import * as Module from "@/lib/email";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/email.tsx", () => {
  it("renders", () => smokeTestReact(Module, "lib/email.tsx"));
});
