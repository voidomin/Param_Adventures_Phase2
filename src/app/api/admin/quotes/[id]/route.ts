import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const quoteSchema = z.object({
  text: z.string().min(1, "Quote text is required"),
  author: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/quotes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, ["trip:create", "system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const quote = await prisma.adventureQuote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error: unknown) {
    console.error("Fetch quote error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/quotes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, ["trip:create", "system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parseResult = quoteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const quote = await prisma.adventureQuote.update({
      where: { id },
      data: parseResult.data,
    });

    return NextResponse.json(quote);
  } catch (error: unknown) {
    console.error("Update quote error:", error);
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/quotes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, ["trip:create", "system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.adventureQuote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete quote error:", error);
    return NextResponse.json(
      { error: "Failed to delete quote" },
      { status: 500 },
    );
  }
}
