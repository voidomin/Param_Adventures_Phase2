import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Full Name is required").max(100),
  phoneNumber: z.string().min(1, "Phone Number is required").max(20),
  avatarUrl: z
    .string()
    .refine(
      (val: string) => {
        if (!val) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid avatar URL" },
    )
    .optional()
    .nullable(),
  gender: z.string().min(1, "Gender is required").max(20),
  age: z.number().int().min(1).max(120).optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactNumber: z.string().optional().nullable(),
  emergencyRelationship: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = profileSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const {
      name,
      phoneNumber,
      avatarUrl,
      gender,
      age,
      bloodGroup,
      emergencyContactName,
      emergencyContactNumber,
      emergencyRelationship,
    } = parseResult.data;

    if (emergencyContactNumber?.trim() === phoneNumber.trim()) {
      return NextResponse.json(
        { error: "Emergency contact number cannot be your own phone number." },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        avatarUrl: avatarUrl || null,
        gender: gender || null,
        age: age ? Number(age) : null,
        bloodGroup: bloodGroup || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactNumber: emergencyContactNumber || null,
        emergencyRelationship: emergencyRelationship || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        gender: true,
        age: true,
        bloodGroup: true,
        emergencyContactName: true,
        emergencyContactNumber: true,
        emergencyRelationship: true,
        role: true,
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json(
      { message: "Profile updated successfully", user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    console.error("[PROFILE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
