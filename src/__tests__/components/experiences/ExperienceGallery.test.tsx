import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExperienceGallery from "@/components/experiences/ExperienceGallery";
import React from "react";

// Mock framer-motion to avoid animation hangs
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe("ExperienceGallery Smoke Test", () => {
  const images = [
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg",
    "https://example.com/video1.mp4",
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the gallery with provided images", () => {
    render(<ExperienceGallery images={images} />);
    
    // Check for images
    const imgElements = screen.getAllByRole("img");
    expect(imgElements.length).toBe(2);
    
    // Check for video
    const videoElement = document.querySelector("video");
    expect(videoElement).toBeDefined();
  });

  it("opens lightbox when an image is clicked", () => {
    render(<ExperienceGallery images={images} />);
    
    const firstImage = screen.getAllByRole("img")[0];
    fireEvent.click(firstImage.parentElement!);

    // Lightbox should match image Detail 1
    expect(screen.getByAltText(/Item detail 1/i)).toBeInTheDocument();
    
    // Close button should be present
    expect(document.querySelector(".lucide-x")).toBeDefined();
  });

  it("navigates next and previous in lightbox", () => {
    render(<ExperienceGallery images={images} />);
    
    // Open first image
    fireEvent.click(screen.getAllByRole("img")[0].parentElement!);
    
    // Find next button (ChevronRight)
    const nextBtn = document.querySelector(".lucide-chevron-right");
    expect(nextBtn).toBeDefined();

    // Click next
    fireEvent.click(nextBtn!.parentElement!);
    expect(screen.getByAltText(/Item detail 2/i)).toBeInTheDocument();
    
    // Find prev button (ChevronLeft)
    const prevBtn = document.querySelector(".lucide-chevron-left");
    fireEvent.click(prevBtn!.parentElement!);
    expect(screen.getByAltText(/Item detail 1/i)).toBeInTheDocument();
  });

  it("returns null when no images provided", () => {
    const { container } = render(<ExperienceGallery images={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
