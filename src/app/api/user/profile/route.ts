import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
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
    } = body;

    // Validate inputs
    // Enforcing: name, phoneNumber, and gender as compulsory
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Full Name is required" },
        { status: 400 },
      );
    }
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return NextResponse.json(
        { error: "Phone Number is required" },
        { status: 400 },
      );
    }
    if (!gender || gender.trim().length === 0) {
      return NextResponse.json(
        { error: "Gender is required" },
        { status: 400 },
      );
    }

    if (
      emergencyContactNumber &&
      emergencyContactNumber.trim() === phoneNumber.trim()
    ) {
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
