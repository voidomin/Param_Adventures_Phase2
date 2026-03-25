import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SaveButton from "@/components/experiences/SaveButton";
import React from "react";
import { useAuth } from "@/lib/AuthContext";

// Mock Auth and Router
vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => <div {...props}>{children}</div>,
  },
}));

describe("SaveButton Smoke Test", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("alert", vi.fn());
  });

  it("prompts to login when user is unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    render(<SaveButton experienceId="1" />);
    
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining("Please log in"));
  });

  it("shows saved state when experience is in wishlist", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } } as any);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ saved: [{ experience: { id: "1" } }] }),
    } as Response);

    render(<SaveButton experienceId="1" />);
    
    await waitFor(() => {
      expect(screen.getByLabelText("Remove from wishlist")).toBeInTheDocument();
    });
    
    // Check for red heart (fill-red-500 class)
    const heart = document.querySelector(".fill-red-500");
    expect(heart).toBeDefined();
  });

  it("toggles saved state when clicked (authenticated)", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } } as any);
    
    // Initial fetch (not saved)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ saved: [] }),
    } as Response);

    render(<SaveButton experienceId="1" />);
    
    const btn = await screen.findByRole("button");
    
    // Mock POST call
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(screen.getByLabelText("Remove from wishlist")).toBeInTheDocument();
    });
  });
});
