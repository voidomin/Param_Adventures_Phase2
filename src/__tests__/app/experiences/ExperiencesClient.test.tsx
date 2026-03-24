import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExperiencesClient from "@/app/experiences/ExperiencesClient";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/AuthContext", () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, loading: false }),
}));


const mockCategories = [
  { id: "c1", name: "Trekking", slug: "trekking", icon: "Mountain" },
  { id: "c2", name: "Camping", slug: "camping", icon: "Tent" }
];

const mockExperiences = [
  {
    id: "exp-1",
    title: "Everest Base Camp",
    slug: "everest-base-camp",
    description: "A great trek",
    durationDays: 14,
    location: "Nepal",
    basePrice: 50000,
    capacity: 15,
    difficulty: "EXTREME" as const,
    status: "PUBLISHED",
    images: ["img1.jpg"],
    categories: [{ category: { id: "c1", name: "Trekking", slug: "trekking" } }],
    slotsCount: 2
  },
  {
    id: "exp-2",
    title: "Rishikesh Camping",
    slug: "rishikesh-camping",
    description: "Riverside camp",
    durationDays: 3,
    location: "India",
    basePrice: 5000,
    capacity: 30,
    difficulty: "EASY" as const,
    status: "PUBLISHED",
    images: ["img2.jpg"],
    categories: [{ category: { id: "c2", name: "Camping", slug: "camping" } }],
    slotsCount: 0
  }
];

describe("ExperiencesClient", () => {
  it("renders correctly and filters by category", () => {
    render(
      <ExperiencesClient
        initialExperiences={mockExperiences}
        categories={mockCategories}
        initialFilter="all"
      />
    );

    expect(screen.getByText("Everest Base Camp")).toBeInTheDocument();
    expect(screen.getByText("Rishikesh Camping")).toBeInTheDocument();

    // Click category
    fireEvent.click(screen.getByRole('button', { name: /Trekking/i }));
    
    // "Rishikesh Camping" might disappear
    expect(screen.queryByText("Rishikesh Camping")).not.toBeInTheDocument();
    expect(screen.getByText("Everest Base Camp")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(
      <ExperiencesClient
        initialExperiences={mockExperiences}
        categories={mockCategories}
        initialFilter="all"
      />
    );

    const searchInputs = screen.getAllByPlaceholderText("Search trips...");
    // use desktop input
    fireEvent.change(searchInputs[0], { target: { value: "everest" } });

    expect(screen.queryByText("Rishikesh Camping")).not.toBeInTheDocument();
    expect(screen.getByText("Everest Base Camp")).toBeInTheDocument();
  });

  it("filters by advanced filters", () => {
    render(
      <ExperiencesClient
        initialExperiences={mockExperiences}
        categories={mockCategories}
        initialFilter="all"
      />
    );

    fireEvent.click(screen.getByText("Filters"));
    
    // Duration
    const minDaysInput = screen.getByPlaceholderText("Min");
    fireEvent.change(minDaysInput, { target: { value: "10" } });
    
    expect(screen.queryByText("Rishikesh Camping")).not.toBeInTheDocument();
    expect(screen.getByText("Everest Base Camp")).toBeInTheDocument();
  });
});
