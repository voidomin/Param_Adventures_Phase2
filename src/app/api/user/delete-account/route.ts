import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit-logger";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.literal("DELETE", { message: 'You must type "DELETE" to confirm' }),
});

/**
 * POST /api/user/delete-account
 *
 * Soft-deletes the logged-in user's own account: anonymizes personally
 * identifying fields and invalidates all sessions, but does NOT hard-delete
 * the row. Booking/payment/coupon records are financial and audit records
 * that must be retained (tax/accounting compliance) and reference this user
 * by a required foreign key, so they're kept, just no longer tied to any
 * recoverable personal information.
 */
export async function POST(request: NextRequest) {
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
    const parseResult = deleteAccountSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user?.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isCorrect = await bcrypt.compare(password, user.password);
    if (!isCorrect) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    // Block deletion while there's an unresolved financial or upcoming-trip
    // obligation, rather than silently orphaning it.
    const blockingBooking = await prisma.booking.findFirst({
      where: {
        userId: payload.userId,
        OR: [
          { paymentStatus: { in: ["PENDING", "PARTIALLY_PAID", "REFUND_PENDING"] } },
          {
            bookingStatus: "CONFIRMED",
            slot: { date: { gte: new Date() } },
          },
        ],
      },
      select: { id: true },
    });

    if (blockingBooking) {
      return NextResponse.json(
        {
          error:
            "You have an upcoming trip or an unresolved payment/refund. Please cancel or resolve it before deleting your account.",
        },
        { status: 409 },
      );
    }

    const anonymizedEmail = `deleted-${user.id}@deleted.paramadventures.in`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: anonymizedEmail,
        name: "Deleted User",
        password: null,
        phoneNumber: null,
        avatarUrl: null,
        googleId: null,
        dateOfBirth: null,
        bloodGroup: null,
        emergencyContactName: null,
        emergencyContactNumber: null,
        emergencyRelationship: null,
        gender: null,
        resetToken: null,
        resetTokenExpiry: null,
        deletedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });

    await logActivity("ACCOUNT_DELETED", user.id, "User", user.id, {
      requestedBy: "self",
    });

    const response = NextResponse.json({ message: "Your account has been deleted." });
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 },
    );
  }
}
