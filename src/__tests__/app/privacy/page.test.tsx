import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage, { metadata } from "@/app/privacy/page";

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

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

  it("renders policy sections and contact email", async () => {
    const ui = await PrivacyPage();
    render(ui);

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
      screen.getByText(/info@paramadventures.in/i),
    ).toBeInTheDocument();
  }, 10000);
});
