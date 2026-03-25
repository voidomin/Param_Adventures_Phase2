import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AuthBackgroundManager from "@/components/admin/AuthBackgroundManager";

vi.mock("@/components/admin/MediaUploader", () => ({
  default: ({ onUploadSuccess }: any) => (
    <div>
      <button
        type="button"
        onClick={() => onUploadSuccess(["https://example.com/new-image.jpg"])}
      >
        Upload mock
      </button>
      <button type="button" onClick={() => onUploadSuccess([])}>
        Upload empty
      </button>
    </div>
  ),
}));

describe("AuthBackgroundManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("shows loading spinner while settings request is pending", () => {
    (globalThis.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<AuthBackgroundManager />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders existing media and default uploader states", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        settings: [
          { key: "auth_login_bg", value: "https://example.com/login.mp4" },
        ],
      }),
    });

    render(<AuthBackgroundManager />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Page Background")).toBeInTheDocument();
      expect(screen.getByText("Sign Up Page Background")).toBeInTheDocument();
    });

    expect(document.querySelector("video")).toBeInTheDocument();
    expect(screen.getByText("Using default image")).toBeInTheDocument();
  });

  it("uploads background and refreshes settings", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: [] }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: [
            {
              key: "auth_login_bg",
              value: "https://example.com/new-image.jpg",
            },
          ],
        }),
      });

    render(<AuthBackgroundManager />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Upload mock" }).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Upload mock" })[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "auth_login_bg",
          value: "https://example.com/new-image.jpg",
        }),
      });
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/settings");
  });

  it("skips upload request when uploader returns empty urls", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ settings: [] }),
    });

    render(<AuthBackgroundManager />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Upload empty" }).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Upload empty" })[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("removes an existing background and refreshes", async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: [
            {
              key: "auth_register_bg",
              value: "https://example.com/register.jpg",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: [] }),
      });

    render(<AuthBackgroundManager />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /remove/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/settings?key=auth_register_bg",
        { method: "DELETE" },
      );
    });
  });

  it("handles fetch failure by stopping loading and showing defaults", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (globalThis.fetch as any).mockRejectedValueOnce(new Error("network"));

    render(<AuthBackgroundManager />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Page Background")).toBeInTheDocument();
      expect(screen.getByText("Sign Up Page Background")).toBeInTheDocument();
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
