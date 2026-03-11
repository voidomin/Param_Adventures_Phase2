import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
        icon: c.icon,
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

import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  icon: z.string().optional().nullable(),
});

/**
 * POST /api/admin/categories — Create a new category
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = categorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { name, icon } = parseResult.data;

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
        icon: icon || null,
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 },
    );
  }
}
