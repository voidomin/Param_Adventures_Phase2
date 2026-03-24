import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import LoginPage from "@/app/login/page";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock AuthContext
vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock AuthLayout to simplify testing form logic without dealing with side effects
vi.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-layout">{children}</div>,
  itemVariants: {},
}));

describe("LoginPage", () => {
  const mockLogin = vi.fn();
  const mockPush = vi.fn();
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ login: mockLogin });
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useSearchParams as any).mockReturnValue({ get: mockGet });
    mockGet.mockReturnValue(null); // default no redirect
  });

  it("renders the login form elements", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("handles successful login submission", async () => {
    mockLogin.mockResolvedValue(undefined); // Success

    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "password123" } });
    
    // Check initial button state
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
    
    // Expect generic redirect to / since useSearchParams returned null
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("handles successful login with redirect param", async () => {
    mockLogin.mockResolvedValue(undefined);
    mockGet.mockReturnValue("/dashboard");

    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays an error message upon failed login", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    const errorMsg = await screen.findByText("Invalid credentials");
    expect(errorMsg).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("toggles password visibility", () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    // The button doesn't have an explicit label, it just has the Eye icon. 
    // It's the only button besides the submit button
    const buttons = screen.getAllByRole("button");
    const toggleBtn = buttons.find(b => b.type === "button"); // Search for type="button" instead of type="submit"
    
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");
      
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "password");
    }
  });
});
