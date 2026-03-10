import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

/**
 * GET /api/bookings/[id]/invoice
 * Securely fetch the data needed for purely client-side PDF invoice generation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth Check
    const token = request.cookies.get("accessToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        experience: {
          select: { title: true, location: true }
        },
        participants: {
          select: { name: true, isPrimary: true, email: true, phoneNumber: true, pickupPoint: true }
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.userId !== payload.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch live company details right now for the header (Even though tax rates are frozen, the header usually matches current business address unless historically versioned too, but for now we pull current).
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ['companyName', 'companyAddress', 'gstNumber', 'panNumber', 'stateCode'] } }
    });
    
    const companyInfo = settings.reduce((acc, current) => {
      acc[current.key] = current.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      booking: {
         id: booking.id,
         date: booking.createdAt,
         totalPrice: booking.totalPrice,
         baseFare: booking.baseFare,
         taxBreakdown: booking.taxBreakdown,
         status: booking.bookingStatus,
         participantCount: booking.participantCount,
      },
      experience: booking.experience,
      primaryContact: booking.participants.find(p => p.isPrimary) || booking.participants[0],
      payment: booking.payments[0] || null,
      company: companyInfo
    });

  } catch (error) {
    console.error("Fetch invoice data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice data." },
      { status: 500 },
    );
  }
}
