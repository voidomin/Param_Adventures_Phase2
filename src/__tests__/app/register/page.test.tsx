import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/register/page";

const mockPush = vi.fn();
const mockRegister = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, ...props }: any) =>
          React.createElement(tag, props, children);
      },
    },
  ),
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ register: mockRegister }),
}));

vi.mock("@/components/auth/AuthLayout", () => ({
  default: ({ heading, subheading, children }: any) => (
    <div>
      <h1>{heading}</h1>
      <p>{subheading}</p>
      {children}
    </div>
  ),
  itemVariants: {},
}));

vi.mock("@/components/auth/AuthShared", () => ({
  AuthInput: ({ id, label, value, onChange, type = "text", required }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-label={label}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
      />
    </div>
  ),
  AuthButton: ({ isSubmitting, loadingText, text }: any) => (
    <button type="submit">{isSubmitting ? loadingText : text}</button>
  ),
}));

vi.mock("@/components/auth/PasswordStrength", () => ({
  default: ({ password }: { password: string }) => (
    <div data-testid="password-strength">{password.length}</div>
  ),
}));

describe("app/register/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders register page fields", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("heading", { name: "Create Account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("shows mismatch error and blocks submit", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "A User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it("registers successfully and redirects home", async () => {
    mockRegister.mockResolvedValue(undefined);

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "A User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "a@example.com",
        "password123",
        "A User",
      );
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
