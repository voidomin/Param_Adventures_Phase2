import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LegalLayout from "@/components/layout/LegalLayout";

describe("LegalLayout", () => {
  it("renders title, explicit update date, and children", () => {
    render(
      <LegalLayout title="Privacy Policy" updateDate="March 25, 2026">
        <p>Policy content</p>
      </LegalLayout>,
    );

    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(
      screen.getByText("Last updated: March 25, 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("Policy content")).toBeInTheDocument();
  });

  it("uses default date label when updateDate is omitted", () => {
    render(
      <LegalLayout title="Terms">
        <p>Terms content</p>
      </LegalLayout>,
    );

    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});
