import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import RegisterPage from "@/app/register/page";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/lib/AuthContext", () => ({ useAuth: vi.fn() }));

// Mock AuthLayout
vi.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-layout">{children}</div>,
  itemVariants: {},
}));

describe("RegisterPage", () => {
  const mockRegister = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ register: mockRegister });
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  it("renders the register form elements", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    const pwds = screen.getAllByLabelText(/Password/i);
    expect(pwds.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("shows an error if passwords do not match", async () => {
    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    // Finding exactly the password and confirm password inputs can be tricky, let's use placeholder or specific labels
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password456" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));
    
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows an error if password is less than 8 characters", async () => {
    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.change(confirmInput, { target: { value: "short" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));
    
    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("handles successful registration", async () => {
    mockRegister.mockResolvedValue(undefined);

    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "Test User");
    });
    
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("displays an error message upon failed registration", async () => {
    mockRegister.mockRejectedValue(new Error("Email already in use"));

    render(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
    
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    expect(await screen.findByText("Email already in use")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
