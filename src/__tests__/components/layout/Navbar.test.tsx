import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Navbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock AuthContext
vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock ThemeToggle
vi.mock("@/components/ui/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

describe("Navbar Smoke Test", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: null,
      isLoading: false,
      logout: mockLogout,
    });
    (usePathname as any).mockReturnValue("/");
  });

  it("renders the navbar with logo and links", () => {
    render(<Navbar />);
    expect(screen.getByAltText("Param Adventures")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
  });

  it("returns null on admin routes", () => {
    (usePathname as any).mockReturnValue("/admin/dashboard");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders authenticated user state", () => {
    (useAuth as any).mockReturnValue({
      user: { name: "Test User", role: "USER" },
      isLoading: false,
      logout: mockLogout,
    });
    render(<Navbar />);
    expect(screen.getByText("Test")).toBeInTheDocument(); // Navbar shows first name
    expect(screen.getByTitle("Logout")).toBeInTheDocument();
  });

  it("renders admin dashboard link for admins", () => {
    (useAuth as any).mockReturnValue({
      user: { name: "Admin User", role: "ADMIN" },
      isLoading: false,
      logout: mockLogout,
    });
    render(<Navbar />);
    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
  });

  it("toggles mobile menu", () => {
    render(<Navbar />);
    // Large screens hide the mobile menu button usually, but RTL doesn't care about CSS media queries unless JS-based
    const menuBtn = screen.getByRole("button", { name: "" }); // lucide-react Menu doesn't have label by default
    // Let's find by class or icon if possible, but easier to just click the button that toggles isOpen
    fireEvent.click(menuBtn);
    
    // Check if mobile overlay is present (Open menu shows X icon)
    // When open, there are two "Explore" links (desktop and mobile)
    expect(screen.getAllByText(/Explore/i).length).toBe(2);
  });
});
