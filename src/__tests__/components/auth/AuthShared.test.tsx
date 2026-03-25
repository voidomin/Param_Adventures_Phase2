import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthInput, AuthButton } from "@/components/auth/AuthShared";

describe("AuthShared", () => {
  it("renders input label and forgot-password link for login password", () => {
    render(
      <AuthInput
        id="login-password"
        label="Password"
        type="password"
        placeholder="Enter password"
      />,
    );

    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  }, 10000);

  it("toggles password visibility when toggle is enabled", () => {
    render(
      <AuthInput
        id="register-password"
        label="Create Password"
        type="password"
        showPasswordToggle
      />,
    );

    const input = screen.getByLabelText("Create Password") as HTMLInputElement;
    expect(input.type).toBe("password");

    const toggleButton = screen.getByRole("button");
    fireEvent.click(toggleButton);
    expect(input.type).toBe("text");

    fireEvent.click(toggleButton);
    expect(input.type).toBe("password");
  });

  it("renders button states for submitting and default submit type", () => {
    const { rerender } = render(
      <AuthButton isSubmitting={false} loadingText="Submitting..." text="Continue" />,
    );

    const defaultButton = screen.getByRole("button", { name: /continue/i });
    expect(defaultButton).toHaveAttribute("type", "submit");
    expect(defaultButton).not.toBeDisabled();

    rerender(
      <AuthButton
        isSubmitting
        loadingText="Submitting..."
        text="Continue"
        type="button"
      />,
    );

    const loadingButton = screen.getByRole("button", { name: /submitting/i });
    expect(loadingButton).toHaveAttribute("type", "button");
    expect(loadingButton).toBeDisabled();
  });
});
