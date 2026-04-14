import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { bookingSchema } from "@/lib/validators/booking.schema";
import { BookingService } from "@/services/booking.service";

/**
 * POST /api/bookings
 * 
 * Thin Controller: Handles HTTP authorization, input validation, 
 * and delegates business orchestration to BookingService.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();

    // 1. Validation
    const parseResult = bookingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }

    // 2. Business Logic Execution (Service Layer)
    const result = await BookingService.processBooking(auth.userId, parseResult.data);

    // 3. Normalized API Response
    return NextResponse.json(result);

  } catch (error: unknown) {
    // Map internal error types to HTTP responses
    const errorMap: Record<string, { message: string, status: number }> = {
      "EXPERIENCE_NOT_AVAILABLE": { message: "Experience not found or unavailable.", status: 404 },
      "SLOT_MISMATCH": { message: "Selected slot does not belong to this experience.", status: 404 },
      "INSUFFICIENT_CAPACITY": { message: "Requested slots are no longer available.", status: 409 },
      "OVERBOOKED": { message: "Sorry, those seats were just booked by someone else.", status: 409 },
      "PAYMENT_GATEWAY_ERROR": { message: "Payment gateway unavailable. Please try again.", status: 502 },
    };

    const errorMessage = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = errorMap[errorMessage];
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    console.error("[BookingController] Fatal Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating your booking." },
      { status: 500 },
    );
  }
}
