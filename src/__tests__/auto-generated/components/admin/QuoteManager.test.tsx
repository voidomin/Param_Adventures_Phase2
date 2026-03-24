import { describe, it } from "vitest";
import * as Module from "@/components/admin/QuoteManager";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/QuoteManager.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/QuoteManager.tsx"));
});
