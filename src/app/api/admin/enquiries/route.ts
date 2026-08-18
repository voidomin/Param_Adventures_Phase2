import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";

// GET /api/admin/enquiries — Super Admin / Admin access to active sales enquiries (< 24h old)
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "OPERATIONS_MANAGER", "TRIP_MANAGER"];
  if (!allowedRoles.includes(auth.roleName)) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingEnquiries = await prisma.booking.findMany({
      where: {
        bookingStatus: "REQUESTED",
        paymentStatus: "PENDING",
        createdAt: { gte: twentyFourHoursAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        slot: {
          select: {
            id: true,
            date: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ pendingEnquiries });
  } catch (error) {
    console.error("[AdminEnquiries] Error fetching pending sales enquiries:", error);
    return NextResponse.json({ error: "Failed to fetch sales enquiries." }, { status: 500 });
  }
}
