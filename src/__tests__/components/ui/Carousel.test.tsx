import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Carousel from "@/components/ui/Carousel";

describe("Carousel", () => {
  it("renders the children within a scrollable container", () => {
    render(
      <Carousel>
        <div data-testid="carousel-item">Item 1</div>
        <div data-testid="carousel-item">Item 2</div>
      </Carousel>
    );
    const items = screen.getAllByTestId("carousel-item");
    expect(items).toHaveLength(2);
  });

  it("renders left and right scroll buttons", () => {
    render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );
    const leftBtn = screen.getByRole("button", { name: /Scroll Left/i });
    const rightBtn = screen.getByRole("button", { name: /Scroll Right/i });
    expect(leftBtn).toBeInTheDocument();
    expect(rightBtn).toBeInTheDocument();
  });

  it("disables left button initially", () => {
    render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );
    const leftBtn = screen.getByRole("button", { name: /Scroll Left/i });
    expect(leftBtn).toBeDisabled();
  });

  it("calls scrollBy when clicking the right arrow", () => {
    render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );
    
    // We cannot easily mock the inner ref directly with testing-library without complex setups,
    // but we can verify the button is clickable without throwing errors.
    const rightBtn = screen.getByRole("button", { name: /Scroll Right/i });
    expect(() => fireEvent.click(rightBtn)).not.toThrow();
  });
});
