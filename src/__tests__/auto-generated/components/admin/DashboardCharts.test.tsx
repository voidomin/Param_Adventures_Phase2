import { describe, it } from "vitest";
import * as Module from "@/components/admin/DashboardCharts";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/DashboardCharts.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/DashboardCharts.tsx"));
});
