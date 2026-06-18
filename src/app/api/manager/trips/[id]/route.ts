import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorizeRequest } from "@/lib/api-auth";
import { z } from "zod";

const vendorContactSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
});

const staySchema = z.object({
  name: z.string().min(1, "Stay name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  location: z.string().min(1, "Location is required"),
  locationLink: z.string().min(1, "Location link is required"),
  address: z.string().min(1, "Address is required"),
});

const transportSchema = z.object({
  driverName: z.string().min(1, "Driver name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  vehicleType: z.string().min(1, "Vehicle type is required"),
});

const vendorContactsStructureSchema = z.object({
  stays: z.array(staySchema).optional().nullable(),
  transports: z.array(transportSchema).optional().nullable(),
  otherContacts: z.array(vendorContactSchema).optional().nullable(),
});

const tripUpdateSchema = z.object({
  vendorContacts: z.union([
    vendorContactsStructureSchema,
    z.array(vendorContactSchema)
  ]).optional().nullable(),
  whatsAppUrl: z.string().regex(/^https?:\/\/.+$/, { message: "Must be a valid URL" }).or(z.literal("")).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/manager/trips/[id]
 * Returns full slot detail: experience, bookings list, trek lead assignments, vendor contacts.
 * Only accessible to the manager assigned to this slot.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            location: true,
            durationDays: true,
            images: true,
            difficulty: true,
          },
        },
        manager: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            trekLead: { select: { id: true, name: true, email: true } },
          },
        },
        bookings: {
          where: { bookingStatus: "CONFIRMED", deletedAt: null },
          include: {
            participants: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        tripLog: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    // Only the assigned manager (or admin) can view this
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(
      user?.role.name ?? "",
    );

    if (slot.managerId !== userId && !isAdminOrAbove) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Manager trip detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip details." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/manager/trips/[id]
 * Allows the assigned manager to update vendorContacts on the slot.
 * Body: { vendorContacts: [{label: string, value: string}] }
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id: slotId } = await params;
    const userId = auth.userId;
    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = tripUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { vendorContacts, whatsAppUrl } = parseResult.data;

    // Verify this manager owns the slot
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: { managerId: true },
    });

    if (!slot) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });

    const isAdminOrAbove = ["ADMIN", "SUPER_ADMIN"].includes(
      user?.role.name ?? "",
    );

    if (slot.managerId !== userId && !isAdminOrAbove) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const updateData: Prisma.SlotUpdateInput = {};
    if (vendorContacts !== undefined) {
      updateData.vendorContacts = vendorContacts ?? [];
    }
    if (whatsAppUrl !== undefined) {
      updateData.whatsAppUrl = whatsAppUrl || null;
    }

    const updated = await prisma.slot.update({
      where: { id: slotId },
      data: updateData,
    });

    return NextResponse.json({ slot: updated });
  } catch (error) {
    console.error("Update vendor contacts error:", error);
    return NextResponse.json(
      { error: "Failed to update trip details." },
      { status: 500 },
    );
  }
}
