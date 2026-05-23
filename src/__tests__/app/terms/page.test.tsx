import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsPage, { metadata } from "@/app/terms/page";

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

describe("app/terms/page", () => {
  it("exports metadata for terms page", () => {
    expect(metadata.title).toBe("Terms & Conditions | Param Adventures");
    expect(String(metadata.description)).toContain("booking experiences");
  });

  it("renders core terms sections", async () => {
    const ui = await TermsPage();
    render(ui);

    expect(
      screen.getByRole("heading", { name: "Terms & Conditions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Booking & Participation Policy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Itinerary & Operational Changes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Accommodation & Food/i }),
    ).toBeInTheDocument();
  }, 10000);
});
