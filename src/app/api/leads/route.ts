import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  requirements: z
    .string()
    .min(10, "Please provide more details on your requirements"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = leadSchema.parse(body);

    const lead = await prisma.customLead.create({
      data,
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Failed to create CustomLead:", error);
    return NextResponse.json(
      { error: "Failed to submit request. Please try again." },
      { status: 500 },
    );
  }
}
