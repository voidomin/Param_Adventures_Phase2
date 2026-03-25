import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage, { metadata } from "@/app/privacy/page";

vi.mock("@/components/layout/LegalLayout", () => ({
  default: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="legal-content">{children}</div>
    </div>
  ),
}));

describe("app/privacy/page", () => {
  it("exports metadata for privacy page", () => {
    expect(metadata.title).toBe("Privacy Policy");
    expect(String(metadata.description)).toContain("data handling");
  });

  it("renders policy sections and contact email", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Information We Collect/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /How We Use Your Information/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/privacy@paramadventures.com/i),
    ).toBeInTheDocument();
  });
});
