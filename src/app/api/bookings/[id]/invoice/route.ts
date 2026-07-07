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
    const payload = await verifyAccessToken(token);
    if (!payload?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const booking = await (prisma.booking as any).findUnique({
      where: { id },
      include: {
        experience: {
          select: { title: true, location: true }
        },
        participants: {
          select: { name: true, isPrimary: true, email: true, phoneNumber: true, pickupPoint: true }
        },
        payments: {
          where: { status: "PAID" },
          orderBy: { createdAt: "asc" }
        },
        couponTransactions: {
          where: { type: "REDEEMED" }
        }
      }
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    
    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "TRIP_MANAGER", "TREK_LEAD"].includes(payload.roleName);
    if (booking.userId !== payload.userId && !isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch live company details right now for the header
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ['companyName', 'companyAddress', 'gstNumber', 'panNumber', 'stateCode'] } }
    });
    
    const companyInfo = settings.reduce((acc: Record<string, string>, current: any) => {
      acc[current.key] = current.value;
      return acc;
    }, {} as Record<string, string>);

    const couponDiscount = booking.couponTransactions ? booking.couponTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) : 0;

    return NextResponse.json({
      booking: {
         id: booking.id,
         date: booking.createdAt,
         totalPrice: Number(booking.totalPrice),
         baseFare: Number(booking.baseFare),
         taxBreakdown: booking.taxBreakdown,
         status: booking.bookingStatus,
         participantCount: booking.participantCount,
         paymentType: booking.paymentType,
         paidAmount: Number(booking.paidAmount),
         remainingBalance: Number(booking.remainingBalance),
         paymentStatus: booking.paymentStatus,
         couponDiscount,
      },
      experience: booking.experience,
      primaryContact: booking.participants.find((p: any) => p.isPrimary) || booking.participants[0],
      payments: booking.payments.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        providerPaymentId: p.providerPaymentId,
        createdAt: p.createdAt,
      })),
      payment: booking.payments.at(-1) || null,
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
