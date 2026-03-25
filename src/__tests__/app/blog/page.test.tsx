import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BlogListingPage from "@/app/blog/page";

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("app/blog/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when there are no published blogs", async () => {
    mockFindMany.mockResolvedValue([]);

    const ui = await BlogListingPage();
    render(ui);

    expect(screen.getByText("No stories yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Be the first to share your adventure/i),
    ).toBeInTheDocument();
  });

  it("renders published blog cards with author and experience details", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "blog-1",
        slug: "first-blog",
        title: "My First Trek",
        updatedAt: new Date("2026-01-15T00:00:00Z"),
        coverImageUrl: null,
        author: { name: "Asha", avatarUrl: null },
        experience: {
          title: "Kedarkantha",
          slug: "kedarkantha",
          location: "Uttarakhand",
        },
        coverImage: null,
      },
    ]);

    const ui = await BlogListingPage();
    render(ui);

    expect(screen.getByText("My First Trek")).toBeInTheDocument();
    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByText(/About:/i)).toBeInTheDocument();
    expect(screen.getByText("Kedarkantha")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /My First Trek/i }),
    ).toHaveAttribute("href", "/blog/first-blog");
  }, 10000);
});
