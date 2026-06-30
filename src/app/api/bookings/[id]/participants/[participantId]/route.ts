import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { z } from "zod";

const updateParticipantSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: "Invalid email format" }),
  phoneNumber: z.string().min(1, "Phone number is required").optional().or(z.literal("")),
  gender: z.string().min(1, "Gender is required").optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required").optional(),
  bloodGroup: z.string().min(1, "Blood group is required").optional(),
  emergencyContactName: z.string().min(1, "Emergency contact name is required").optional(),
  emergencyContactNumber: z.string().min(1, "Emergency contact number is required").optional(),
  emergencyRelationship: z.string().min(1, "Emergency relationship is required").optional(),
  pickupPoint: z.string().optional().or(z.literal("")),
  dropPoint: z.string().optional().or(z.literal("")),
});

function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return 0;
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  const { id: bookingId, participantId } = await params;
  const userId = auth.userId;

  try {
    const body = await request.json();
    const parsed = updateParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify booking ownership and existence
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Verify participant belongs to this booking
    const participant = await prisma.bookingParticipant.findUnique({
      where: { id: participantId },
    });

    if (participant?.bookingId !== bookingId) {
      return NextResponse.json(
        { error: "Participant not found for this booking." },
        { status: 404 }
      );
    }

    if (participant.isCancelled) {
      return NextResponse.json(
        { error: "Cannot edit details of a cancelled participant." },
        { status: 400 }
      );
    }

    const dataToUpdate: any = { ...parsed.data };
    if (parsed.data.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(parsed.data.dateOfBirth);
      dataToUpdate.age = calculateAge(parsed.data.dateOfBirth);
    }

    const updated = await prisma.bookingParticipant.update({
      where: { id: participantId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error: unknown) {
    console.error("Update participant details error:", error);
    return NextResponse.json(
      { error: "Failed to update participant details." },
      { status: 500 }
    );
  }
}
