import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { SettingsService } from "@/services/settings.service";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/services/settings.service", () => ({
  SettingsService: {
    getMergedSettings: vi.fn(),
    updateSettings: vi.fn(),
    deleteSetting: vi.fn(),
  },
}));

import { DELETE, GET, PUT } from "@/app/api/admin/settings/route";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockGetMergedSettings = vi.mocked(SettingsService.getMergedSettings);
const mockUpdateSettings = vi.mocked(SettingsService.updateSettings);
const mockDeleteSetting = vi.mocked(SettingsService.deleteSetting);

const createRequest = (url: string) => new NextRequest(url);
const createJsonRequest = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });

describe("/api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await GET(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(403);
  });

  it("GET returns merged settings on success", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockGetMergedSettings.mockResolvedValue({ site_k: "site_v", razorpay_mode: "test" });

    const response = await GET(createRequest("http://localhost/api/admin/settings"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.site_k).toBe("site_v");
    expect(data.settings.razorpay_mode).toBe("test");
  });

  it("PUT returns 400 for invalid body format", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { key: "x", value: "y" }),
    );

    expect(response.status).toBe(400);
  });

  it("PUT returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { settings: { k: "v" } }),
    );

    expect(response.status).toBe(403);
  });

  it("PUT delegates update to SettingsService", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUpdateSettings.mockResolvedValue([] as any);

    const response = await PUT(
      createJsonRequest("http://localhost/api/admin/settings", { 
        settings: { "site_key": "val1" } 
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ "site_key": "val1" });
  });

  it("DELETE returns 400 when key is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await DELETE(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(400);
  });

  it("DELETE delegates deletion to SettingsService", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDeleteSetting.mockResolvedValue({ count: 1 } as any);

    const response = await DELETE(
      createRequest("http://localhost/api/admin/settings?key=test_setting"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteSetting).toHaveBeenCalledWith("test_setting");
  });

  it("GET returns 500 on service failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockGetMergedSettings.mockRejectedValue(new Error("service crash"));

    const response = await GET(createRequest("http://localhost/api/admin/settings"));

    expect(response.status).toBe(500);
  });
});
