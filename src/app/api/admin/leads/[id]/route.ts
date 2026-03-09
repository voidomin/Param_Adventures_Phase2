import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

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

    const { status, adminNotes } = await req.json();

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
