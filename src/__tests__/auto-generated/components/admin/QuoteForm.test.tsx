import { describe, it } from "vitest";
import * as Module from "@/components/admin/QuoteForm";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/QuoteForm.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/QuoteForm.tsx"));
});
