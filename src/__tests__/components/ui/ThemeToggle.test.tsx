import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import * as nextThemes from "next-themes";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("ThemeToggle", () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders light mode icon (Moon) when theme is light", async () => {
    (nextThemes.useTheme as any).mockReturnValue({ theme: "light", setTheme: mockSetTheme });
    render(<ThemeToggle />);
    // After mount, it shows the button
    const btn = await screen.findByRole("button", { name: /Toggle Global Theme/i });
    expect(btn).toBeInTheDocument();
    expect(btn.innerHTML).toContain("lucide-moon");
  });

  it("renders dark mode icon (Sun) when theme is dark", async () => {
    (nextThemes.useTheme as any).mockReturnValue({ theme: "dark", setTheme: mockSetTheme });
    render(<ThemeToggle />);
    const btn = await screen.findByRole("button", { name: /Toggle Global Theme/i });
    expect(btn.innerHTML).toContain("lucide-sun");
  });

  it("toggles theme from light to dark on click", async () => {
    (nextThemes.useTheme as any).mockReturnValue({ theme: "light", setTheme: mockSetTheme });
    render(<ThemeToggle />);
    const btn = await screen.findByRole("button", { name: /Toggle Global Theme/i });
    fireEvent.click(btn);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles theme from dark to light on click", async () => {
    (nextThemes.useTheme as any).mockReturnValue({ theme: "dark", setTheme: mockSetTheme });
    render(<ThemeToggle />);
    const btn = await screen.findByRole("button", { name: /Toggle Global Theme/i });
    fireEvent.click(btn);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
