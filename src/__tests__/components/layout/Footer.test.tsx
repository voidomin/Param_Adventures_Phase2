import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Footer from "@/components/layout/Footer";
import { usePathname } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

describe("Footer Smoke Test", () => {
  it("renders the footer with logo and contact info", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<Footer />);
    expect(screen.getByAltText("Param Adventures")).toBeInTheDocument();
    expect(screen.getByText(/Discover the extraordinary/i)).toBeInTheDocument();
    expect(screen.getByText("info@paramadventures.in")).toBeInTheDocument();
  });

  it("returns null on admin routes", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/settings");
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });
});
