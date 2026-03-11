import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/categories/[id] — Update a category
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = updateCategorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { name, isActive, icon } = parseResult.data;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length === 0) {
        return NextResponse.json(
          { error: "Category name cannot be empty." },
          { status: 400 },
        );
      }
      data.name = trimmedName;
      data.slug = trimmedName
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, "");

      // Check slug conflict
      const conflict = await prisma.category.findFirst({
        where: { slug: data.slug as string, id: { not: id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A category with this name already exists." },
          { status: 409 },
        );
      }
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    if (icon !== undefined) {
      data.icon = icon || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/categories/[id] — Delete a category
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { experiences: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 },
      );
    }

    if (existing._count.experiences > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing._count.experiences} experience(s) are using this category.`,
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });

    revalidatePath("/", "layout");

    return NextResponse.json({ message: "Category deleted." });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category." },
      { status: 500 },
    );
  }
}
