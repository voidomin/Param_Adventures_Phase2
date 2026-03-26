import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DifficultyMeter from "@/components/experiences/DifficultyMeter";

describe("DifficultyMeter", () => {
  it("renders correctly for EASY level", () => {
    render(<DifficultyMeter difficulty="EASY" />);
    expect(screen.getByText(/Difficulty: Easy/i)).toBeInTheDocument();
    expect(screen.getByText(/Suitable for beginners/i)).toBeInTheDocument();
  });

  it("renders correctly for MODERATE level", () => {
    render(<DifficultyMeter difficulty="MODERATE" />);
    expect(screen.getByText(/Difficulty: Moderate/i)).toBeInTheDocument();
    expect(screen.getByText(/Requires basic fitness/i)).toBeInTheDocument();
  });

  it("renders correctly for DIFFICULT level", () => {
    render(<DifficultyMeter difficulty="DIFFICULT" />);
    expect(screen.getByText(/Difficulty: Difficult/i)).toBeInTheDocument();
    expect(screen.getByText(/Requires good fitness/i)).toBeInTheDocument();
  });

  it("renders correctly for EXTREME level", () => {
    render(<DifficultyMeter difficulty="EXTREME" />);
    expect(screen.getByText(/Difficulty: Extreme/i)).toBeInTheDocument();
    expect(screen.getByText(/For experienced trekkers only/i)).toBeInTheDocument();
  });

  it("defaults to MODERATE for invalid level", () => {
    // @ts-expect-error - testing invalid input
    render(<DifficultyMeter difficulty="INVALID" />);
    expect(screen.getByText(/Difficulty: Moderate/i)).toBeInTheDocument();
  });
});
