import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateHomepageSectionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  heading: z.string().min(1).max(80).optional(),
  subheading: z.string().max(160).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/homepage-sections/[id] — Rename/edit one of the 5 fixed
 * homepage sections. There is no POST/DELETE for this resource -- the
 * `layout` (which design it renders) is immutable and never touched here.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json();

    const parseResult = updateHomepageSectionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { name, heading, subheading, displayOrder, isActive } = parseResult.data;

    const existing = await prisma.homepageSection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Homepage section not found." },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: "Section name cannot be empty." },
          { status: 400 },
        );
      }
      data.name = trimmed;
    }

    if (heading !== undefined) {
      const trimmed = heading.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: "Section heading cannot be empty." },
          { status: 400 },
        );
      }
      data.heading = trimmed;
    }

    if (subheading !== undefined) {
      data.subheading = subheading ? subheading.trim() : null;
    }

    if (displayOrder !== undefined) {
      data.displayOrder = displayOrder;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    const section = await prisma.homepageSection.update({
      where: { id },
      data,
    });

    await logActivity(
      "HOMEPAGE_SECTION_UPDATED",
      auth.userId,
      "HomepageSection",
      id,
      { name: section.name, layout: section.layout },
    );

    revalidatePath("/", "layout");

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error updating homepage section:", error);
    return NextResponse.json(
      { error: "Failed to update homepage section." },
      { status: 500 },
    );
  }
}
