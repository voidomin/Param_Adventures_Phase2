import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { z } from "zod";

const storyBlockSchema = z.object({
  type: z.enum(["hero", "milestone", "value", "team", "cta"]),
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(500).optional().nullable(),
  body: z.string().max(2000).optional().nullable(),
  imageUrl: z.url().optional().nullable(),
  stat: z.string().max(50).optional().nullable(),
  order: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/story — Returns all StoryBlocks (including inactive).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const isAllowed = ["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"].includes(auth.roleName);
  if (!isAllowed) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  try {
    const blocks = await prisma.storyBlock.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Admin story GET error:", error);
    return NextResponse.json({ error: "Failed to fetch story blocks." }, { status: 500 });
  }
}

/**
 * POST /api/admin/story — Creates a new StoryBlock.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const isAllowed = ["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"].includes(auth.roleName);
  if (!isAllowed) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = storyBlockSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    }

    const block = await prisma.storyBlock.create({
      data: {
        type: result.data.type,
        title: result.data.title,
        subtitle: result.data.subtitle || null,
        body: result.data.body || null,
        imageUrl: result.data.imageUrl || null,
        stat: result.data.stat || null,
        order: result.data.order,
        isActive: result.data.isActive ?? true,
      },
    });

    revalidatePath("/our-story");
    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error("Admin story POST error:", error);
    return NextResponse.json({ error: "Failed to create story block." }, { status: 500 });
  }
}
