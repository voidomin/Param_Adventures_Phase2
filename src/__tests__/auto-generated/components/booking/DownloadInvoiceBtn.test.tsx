import { describe, it } from "vitest";
import * as Module from "@/components/booking/DownloadInvoiceBtn";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/booking/DownloadInvoiceBtn.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/booking/DownloadInvoiceBtn.tsx"));
});
