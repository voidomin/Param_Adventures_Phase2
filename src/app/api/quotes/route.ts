import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomInt } from "node:crypto";

// GET /api/quotes - Public random quote
export async function GET() {
  try {
    const count = await prisma.adventureQuote.count({
      where: { isActive: true },
    });

    if (count === 0) {
      return NextResponse.json({ quote: null });
    }

    const skip = count > 1 ? Math.floor(require("crypto").randomInt(0, count)) : 0;
    const quote = await prisma.adventureQuote.findFirst({
      where: { isActive: true },
      skip: skip,
    });

    return NextResponse.json({ quote });
  } catch (error: any) {
    console.error("Public quotes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 },
    );
  }
}
