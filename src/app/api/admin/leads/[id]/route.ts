import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { z } from "zod";

const leadUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"]),
  adminNotes: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Use project's custom authorization
    const auth = await authorizeRequest(req, "booking:view-all");
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = leadUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { status, adminNotes } = parseResult.data;

    const lead = await prisma.customLead.update({
      where: { id },
      data: {
        status: status as any,
        adminNotes,
      },
    });

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error("Failed to update Lead:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update lead" },
      { status: 500 },
    );
  }
}
