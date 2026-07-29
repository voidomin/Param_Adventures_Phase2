import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { ExperienceService } from "@/services/experience.service";
import { experienceSchema } from "@/lib/validators/experience.schema";

/**
 * GET /api/admin/experiences - List all experiences
 */
export async function GET(request: NextRequest) {
  const result = await authorizeRequest(request, "trip:browse");
  if (!result.authorized) return result.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));

    const { experiences, total } = await ExperienceService.getAllExperiences({ page, limit });
    return NextResponse.json({
      experiences,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: unknown) {
    console.error("Failed to fetch experiences:", err);
    return NextResponse.json({ error: "Failed to fetch experiences" }, { status: 500 });
  }
}

/**
 * POST /api/admin/experiences - Create a new experience
 */
export async function POST(request: NextRequest) {
  const result = await authorizeRequest(request, "trip:create");
  if (!result.authorized) return result.response;

  try {
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = experienceSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });

      return NextResponse.json(
        {
          error: "Validation Failed",
          details: fieldErrors,
          message: parseResult.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    // ─── Orchestration ───────────────────────────────────
    const newExperience = await ExperienceService.createExperience(
      result.userId, 
      parseResult.data
    );

    revalidatePath("/", "layout");

    return NextResponse.json(
      { message: "Experience created successfully", experience: newExperience },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Failed to create experience:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
