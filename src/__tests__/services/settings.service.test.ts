import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    siteSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

import { SettingsService, SENSITIVE_KEYS, PLATFORM_KEYS } from "@/services/settings.service";
import { prisma } from "@/lib/db";

describe("SettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMergedSettings", () => {
    it("merges platform, site, and relevant settings prioritizing platform settings and masking secrets", async () => {
      // Mock db returns
      vi.mocked(prisma.platformSetting.findMany).mockResolvedValue([
        { id: "1", key: "companyName", value: "Param Platform" },
        { id: "2", key: "smtp_pass", value: "super-secret-password" },
      ] as any);

      vi.mocked(prisma.siteSetting.findMany)
        .mockResolvedValueOnce([
          { id: "3", key: "companyName", value: "Param Site" },
          { id: "4", key: "session_lifetime_hrs", value: "24" },
        ] as any) // relevant site settings call
        .mockResolvedValueOnce([
          { id: "5", key: "custom_footer", value: "My footer" },
          { id: "6", key: "companyName", value: "Param All Site" },
        ] as any); // all site settings call

      const merged = await SettingsService.getMergedSettings();

      // Verify merge priority (Platform > Site)
      expect(merged.companyName).toBe("Param Platform");
      expect(merged.session_lifetime_hrs).toBe("24");
      expect(merged.custom_footer).toBe("My footer");

      // Verify sensitive values are masked
      expect(merged.smtp_pass).toBe("[UNREVEALED]");

      expect(prisma.platformSetting.findMany).toHaveBeenCalled();
      expect(prisma.siteSetting.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateSettings", () => {
    it("directs updates to platform or site settings and filters out masked secrets", async () => {
      vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.siteSetting.upsert).mockResolvedValue({} as any);

      const updates = {
        companyName: "New Company", // Platform key
        custom_footer: "New Footer", // Site key
        smtp_pass: "[UNREVEALED]", // Masked secret, should be filtered out
        jwt_secret: "brand-new-secret", // Secret but not masked, should be updated
      };

      await SettingsService.updateSettings(updates);

      // Verify skip logic on "[UNREVEALED]" secret
      expect(prisma.platformSetting.upsert).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: "smtp_pass" } })
      );

      // Verify platform setting update
      expect(prisma.platformSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "companyName" },
          update: { value: "New Company" },
          create: { key: "companyName", value: "New Company" },
        })
      );

      // Verify site setting update
      expect(prisma.siteSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "custom_footer" },
          update: { value: "New Footer" },
          create: { key: "custom_footer", value: "New Footer" },
        })
      );

      // Verify unmasked secret update
      expect(prisma.platformSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "jwt_secret" },
          update: { value: "brand-new-secret" },
          create: { key: "jwt_secret", value: "brand-new-secret" },
        })
      );
    });
  });

  describe("deleteSetting", () => {
    it("deletes site settings by key", async () => {
      vi.mocked(prisma.siteSetting.deleteMany).mockResolvedValue({ count: 1 } as any);

      await SettingsService.deleteSetting("custom_footer");

      expect(prisma.siteSetting.deleteMany).toHaveBeenCalledWith({
        where: { key: "custom_footer" },
      });
    });
  });
});
