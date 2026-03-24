import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Navbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock AuthContext
vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

// Mock ThemeToggle
vi.mock("@/components/ui/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

describe("Navbar Smoke Test", () => {
  it("renders the navbar with logo and links", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<Navbar />);
    expect(screen.getByAltText("Param Adventures")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
  });

  it("returns null on admin routes", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });
});
