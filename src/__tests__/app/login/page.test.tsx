import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";

const mockPush = vi.fn();
const mockLogin = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
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
  useAuth: () => ({ login: mockLogin }),
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

describe("app/login/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it("renders login shell and form controls", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "Welcome Back" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("logs in and redirects to search redirect param", async () => {
    mockGet.mockReturnValue("/dashboard/settings");
    mockLogin.mockResolvedValue({ id: "1" });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "supersecret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@example.com", "supersecret");
      expect(mockPush).toHaveBeenCalledWith("/dashboard/settings");
    });
  });

  it("shows error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });
});
