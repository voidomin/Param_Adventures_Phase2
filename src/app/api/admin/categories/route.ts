import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/categories — List all categories (admin)
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { experiences: true },
        },
      },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        isActive: c.isActive,
        createdAt: c.createdAt,
        experienceCount: c._count.experiences,
      })),
    });
  } catch (error) {
    console.error("Error listing categories:", error);
    return NextResponse.json(
      { error: "Failed to list categories." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/categories — Create a new category
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 },
      );
    }

    // Generate slug from name
    const slug = name
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "");

    // Check for duplicates
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists." },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 },
    );
  }
}
