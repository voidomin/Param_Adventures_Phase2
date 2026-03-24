import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExperienceGallery from "@/components/experiences/ExperienceGallery";
import React from "react";

// Mock framer-motion to avoid complex animation rendering issues in JSDOM
vi.mock("framer-motion", () => {
  return {
    motion: {
      div: ({ children, onClick, layoutId, ...props }: any) => (
        <div data-testid={`motion-div-${layoutId}`} onClick={onClick} {...props}>
          {children}
        </div>
      ),
      button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>
          {children}
        </button>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe("ExperienceGallery Component", () => {
  const sampleImages = [
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg",
    "https://example.com/vid1.mp4",
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the primary image grid successfully", () => {
    render(<ExperienceGallery images={sampleImages} />);
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(2); // 2 images, 1 video
    expect(images[0]).toHaveAttribute("src", sampleImages[0]);
    
    // Check if video is rendered
    // JSDOM doesn't have good support for <video> role, so we check for the element type
    const mediaContainer = screen.getByTestId("motion-div-gallery-https://example.com/vid1.mp4");
    expect(mediaContainer.querySelector("video")).toBeInTheDocument();
  });

  it("returns null when provided with an empty array", () => {
    const { container } = render(<ExperienceGallery images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("opens the fullscreen lightbox modal when an image is clicked", () => {
    render(<ExperienceGallery images={sampleImages} />);
    
    // Click first image
    const firstImageContainer = screen.getByTestId(`motion-div-gallery-${sampleImages[0]}`);
    fireEvent.click(firstImageContainer);
    
    // Lightbox should display the image index text "1 / 3"
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("closes the lightbox safely when close button is clicked", async () => {
    render(<ExperienceGallery images={sampleImages} />);
    
    // Open lightbox
    const firstImageContainer = screen.getByTestId(`motion-div-gallery-${sampleImages[0]}`);
    fireEvent.click(firstImageContainer);
    
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Close lightbox. We mock motion.button, which contains the X icon
    // We can find the button by finding its lucide-react X child or just use querySelector/role if there's no text
    // The first button in the lightbox is the close button, followed by left/right. 
    // They don't have aria-labels, so we grab all buttons in the document not in the main grid
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons[0]; 
    
    fireEvent.click(closeBtn);
    
    expect(screen.queryByText("1 / 3")).not.toBeInTheDocument();
  });

  it("navigates next and prev via buttons and loops around", () => {
    render(<ExperienceGallery images={sampleImages} />);
    
    // Open on first
    fireEvent.click(screen.getByTestId(`motion-div-gallery-${sampleImages[0]}`));
    
    // In our mock, the close button is the first button inside the lightbox
    // then Left Chevron, then Right Chevron
    const buttons = screen.getAllByRole("button");
    const prevBtn = buttons[1];
    const nextBtn = buttons[2];

    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Next
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    
    // Next again
    fireEvent.click(nextBtn);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // Next loops to first
    fireEvent.click(nextBtn);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Prev loops to last
    fireEvent.click(prevBtn);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("responds to keyboard events (ArrowRight, ArrowLeft, Escape)", () => {
    render(<ExperienceGallery images={sampleImages} />);
    
    // Open on second
    fireEvent.click(screen.getByTestId(`motion-div-gallery-${sampleImages[1]}`));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // Arrow Right
    fireEvent.keyDown(globalThis, { key: "ArrowRight", code: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // Arrow Left
    fireEvent.keyDown(globalThis, { key: "ArrowLeft", code: "ArrowLeft" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // Escape to close
    fireEvent.keyDown(globalThis, { key: "Escape", code: "Escape" });
    expect(screen.queryByText("2 / 3")).not.toBeInTheDocument();
  });

  it("shows 'See All' button when images exceed 24 and expands list", () => {
    // Generate array of 30 images
    const manyImages = Array.from({ length: 30 }, (_, i) => `https://example.com/img${i}.jpg`);
    render(<ExperienceGallery images={manyImages} />);
    
    // Initially shows 24 items
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(24);

    // "See All 30 Photos" button should be present
    const seeAllBtn = screen.getByText("See All 30 Photos");
    expect(seeAllBtn).toBeInTheDocument();

    // Click to expand
    fireEvent.click(seeAllBtn);

    // Should show all 30 now
    expect(screen.getAllByRole("img").length).toBe(30);
    
    // Button text changes to "Show Less"
    expect(screen.getByText("Show Less")).toBeInTheDocument();
  });
});
