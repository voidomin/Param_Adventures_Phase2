import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const quoteSchema = z.object({
  text: z.string().min(1, "Quote text is required"),
  author: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/quotes
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["trip:create", "system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const quotes = await prisma.adventureQuote.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ quotes });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    console.error("Fetch quotes error details:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes", details },
      { status: 500 },
    );
  }
}

// POST /api/admin/quotes
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["trip:create", "system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = quoteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    const quote = await prisma.adventureQuote.create({
      data: parseResult.data,
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    console.error("Create quote error details:", error);
    return NextResponse.json(
      { error: "Failed to create quote", details },
      { status: 500 },
    );
  }
}
