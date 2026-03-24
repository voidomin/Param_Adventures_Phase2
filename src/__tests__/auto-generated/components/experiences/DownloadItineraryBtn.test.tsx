import { describe, it } from "vitest";
import * as Module from "@/components/experiences/DownloadItineraryBtn";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/DownloadItineraryBtn.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/DownloadItineraryBtn.tsx"));
});
