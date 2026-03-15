import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  type: z.enum(["hero", "milestone", "value", "team", "cta"]).optional(),
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  stat: z.string().max(50).optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/story/[id] — Updates a StoryBlock.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const isAllowed = ["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"].includes(auth.roleName);
  if (!isAllowed) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    }

    const existing = await prisma.storyBlock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Story block not found." }, { status: 404 });
    }

    const block = await prisma.storyBlock.update({
      where: { id },
      data: result.data,
    });

    revalidatePath("/our-story");
    return NextResponse.json({ block });
  } catch (error) {
    console.error("Admin story PUT error:", error);
    return NextResponse.json({ error: "Failed to update story block." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/story/[id] — Deletes a StoryBlock.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const isAllowed = ["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"].includes(auth.roleName);
  if (!isAllowed) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.storyBlock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Story block not found." }, { status: 404 });
    }

    await prisma.storyBlock.delete({ where: { id } });

    revalidatePath("/our-story");
    return NextResponse.json({ message: "Story block deleted." });
  } catch (error) {
    console.error("Admin story DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete story block." }, { status: 500 });
  }
}
