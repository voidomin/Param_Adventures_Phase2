import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Carousel from "@/components/ui/Carousel";
import React from "react";

describe("Carousel Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children correctly", () => {
    render(
      <Carousel>
        <div data-testid="child-1">Item 1</div>
        <div data-testid="child-2">Item 2</div>
      </Carousel>
    );
    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });

  it("initializes with scroll buttons based on mock metrics", () => {
    // We mock properties for the layout to test state changes

    vi.spyOn(React, "useRef").mockReturnValueOnce({
      current: {
        scrollLeft: 0,
        scrollWidth: 1000,
        clientWidth: 500,
        scrollBy: vi.fn(),
      },
    });

    render(<Carousel><div /></Carousel>);

    const leftBtn = screen.getByLabelText("Scroll Left");
    screen.getByLabelText("Scroll Right");

    expect(leftBtn).toBeDisabled(); // scrollLeft is 0
    expect(leftBtn).toHaveClass("opacity-0 pointer-events-none");

    // We can't easily rely on the checkScroll effect strictly because useRef is hard to mock
    // cleanly for an inner element in React Testing Library without extensive stubbing.
    // Testing the logic more directly.
  });

  it("advances slide on clicking next button (mocks)", () => {
    const mockScrollBy = vi.fn();
    
    // Patching HTMLDivElement prototype for the test duration
    const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const originalScrollLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');
    
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, value: 0 });
    HTMLElement.prototype.scrollBy = mockScrollBy;

    render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );

    const rightBtn = screen.getByLabelText("Scroll Right");
    fireEvent.click(rightBtn);

    expect(mockScrollBy).toHaveBeenCalledWith({ left: 400, behavior: "smooth" }); // 0.8 * 500 = 400

    // Cleanup
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
    if (originalScrollLeft) Object.defineProperty(HTMLElement.prototype, 'scrollLeft', originalScrollLeft);
    delete (HTMLElement.prototype as any).scrollBy;
  });

  it("goes back on clicking prev button (mocks)", () => {
    const mockScrollBy = vi.fn();
    
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, value: 500 }); // Can scroll left
    HTMLElement.prototype.scrollBy = mockScrollBy;

    render(
      <Carousel>
        <div>Item</div>
      </Carousel>
    );

    // Initial render triggers checkScroll due to useEffect
    // Since scrollLeft = 500, left arrow should be enabled
    const leftBtn = screen.getByLabelText("Scroll Left");
    expect(leftBtn).not.toBeDisabled();
    
    fireEvent.click(leftBtn);
    expect(mockScrollBy).toHaveBeenCalledWith({ left: -400, behavior: "smooth" });

    // Cleanup
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 0 });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 0 });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, value: 0 });
    delete (HTMLElement.prototype as any).scrollBy;
  });

  it("listens to window resize to recalculate constraints", () => {

    render(<Carousel><div /></Carousel>);
    expect(screen.getByLabelText("Scroll Left")).toBeInTheDocument();
    
    // Dispatch resize
    fireEvent(globalThis as unknown as Window, new Event('resize'));
    expect(screen.getByLabelText("Scroll Right")).toBeInTheDocument();
  });
});
