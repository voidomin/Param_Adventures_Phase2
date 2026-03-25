import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/app/forgot-password/page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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

describe("app/forgot-password/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form and submits successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Reset link sent" }),
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/forgot-password",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByText("Check Your Inbox")).toBeInTheDocument();
      expect(screen.getByText("Reset link sent")).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it("shows API error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No account found" }),
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "missing@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(screen.getByText("No account found")).toBeInTheDocument();
    });
  });
});
