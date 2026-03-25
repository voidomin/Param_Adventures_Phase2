import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BlogArticlePage, { generateMetadata } from "@/app/blog/[slug]/page";

const { mockBlogFindUnique, mockVerifyAccessToken, mockNotFound, mockCookies } =
  vi.hoisted(() => ({
    mockBlogFindUnique: vi.fn(),
    mockVerifyAccessToken: vi.fn(),
    mockNotFound: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    mockCookies: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findUnique: mockBlogFindUnique,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    notFound: mockNotFound,
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/blog/ClientTiptapViewer", () => ({
  default: () => <div data-testid="blog-content">content</div>,
}));

describe("app/blog/[slug]/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    mockVerifyAccessToken.mockResolvedValue(null);
  });

  it("returns fallback metadata title when blog does not exist", async () => {
    mockBlogFindUnique.mockResolvedValue(null);

    const meta = await generateMetadata({ params: Promise.resolve({ slug: "missing" }) });

    expect(meta.title).toBe("Blog Not Found");
  });

  it("returns seo metadata when blog exists", async () => {
    mockBlogFindUnique.mockResolvedValue({
      title: "Altitude Notes",
      coverImage: { originalUrl: "https://example.com/og.jpg" },
    });

    const meta = await generateMetadata({ params: Promise.resolve({ slug: "altitude-notes" }) });

    expect(meta.title).toBe("Altitude Notes");
    expect(String(meta.description)).toContain("Altitude Notes");
  });

  it("throws notFound for unpublished blogs when user is not moderator", async () => {
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      slug: "draft-blog",
      status: "DRAFT",
      deletedAt: null,
      updatedAt: new Date("2026-02-01T00:00:00Z"),
      title: "Draft",
      theme: "CLASSIC",
      coverImageUrl: null,
      authorSocials: {},
      content: {},
      author: { name: "Sam", avatarUrl: null },
      experience: null,
    });

    await expect(
      BlogArticlePage({ params: Promise.resolve({ slug: "draft-blog" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders published article and cta link", async () => {
    mockBlogFindUnique.mockResolvedValue({
      id: "b2",
      slug: "published-blog",
      status: "PUBLISHED",
      deletedAt: null,
      updatedAt: new Date("2026-02-01T00:00:00Z"),
      title: "Published Blog",
      theme: "CLASSIC",
      coverImageUrl: null,
      authorSocials: {},
      content: {},
      author: { name: "Sam", avatarUrl: null },
      experience: {
        id: "e1",
        title: "Kedarkantha",
        slug: "kedarkantha",
        location: "Uttarakhand",
        basePrice: 15999,
        images: ["exp.jpg"],
      },
    });

    const ui = await BlogArticlePage({ params: Promise.resolve({ slug: "published-blog" }) });
    render(ui);

    expect(screen.getByRole("heading", { name: "Published Blog" })).toBeInTheDocument();
    expect(screen.getByTestId("blog-content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book this Trip/i })).toHaveAttribute(
      "href",
      "/experiences/kedarkantha",
    );
  }, 10000);
});
