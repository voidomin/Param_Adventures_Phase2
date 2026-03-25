import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PasswordStrength from "@/components/auth/PasswordStrength";

describe("PasswordStrength", () => {
  it("renders nothing when password is empty", () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Too short' for weak password", () => {
    const { container } = render(<PasswordStrength password="abc" />);
    expect(screen.getByText("Too short")).toBeInTheDocument();

    const bars = container.querySelectorAll(".h-1");
    expect(bars.length).toBe(5);
    bars.forEach((bar) => {
      expect(bar.className).toContain("bg-white/10");
    });
  });

  it("shows 'Excellent' and fills all bars for strong password", () => {
    const { container } = render(<PasswordStrength password="Aa1!aaaaaaaa" />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();

    const bars = container.querySelectorAll(".h-1");
    expect(bars.length).toBe(5);
    bars.forEach((bar) => {
      expect(bar.className).not.toContain("bg-white/10");
    });
  });
});
