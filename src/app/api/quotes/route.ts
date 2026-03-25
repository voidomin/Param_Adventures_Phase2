import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomInt } from "node:crypto";

export const dynamic = "force-dynamic";

// GET /api/quotes - Public random quote
export async function GET() {
  try {
    const count = await prisma.adventureQuote.count({
      where: { isActive: true },
    });

    if (count === 0) {
      return NextResponse.json({ quote: null });
    }

    const skip = count > 1 ? randomInt(0, count) : 0;
    const quote = await prisma.adventureQuote.findFirst({
      where: { isActive: true },
      skip: skip,
    });

    return NextResponse.json(
      { quote },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Public quotes error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch quote",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
