import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

/**
 * GET /api/admin/homepage-sections — List the 5 fixed homepage sections
 * (admin). There is no POST here -- the set of sections is fixed forever,
 * seeded once via prisma/seed.mjs; only PUT /[id] (rename/edit) exists.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "trip:manage-categories");
  if (!auth.authorized) return auth.response;

  try {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { experiences: true } },
      },
    });

    return NextResponse.json({
      sections: sections.map((s) => ({
        id: s.id,
        layout: s.layout,
        name: s.name,
        heading: s.heading,
        subheading: s.subheading,
        displayOrder: s.displayOrder,
        isActive: s.isActive,
        experienceCount: s._count.experiences,
      })),
    });
  } catch (error) {
    console.error("Error listing homepage sections:", error);
    return NextResponse.json(
      { error: "Failed to list homepage sections." },
      { status: 500 },
    );
  }
}
