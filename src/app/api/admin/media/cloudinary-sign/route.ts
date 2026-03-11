import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { generateCloudinarySignature } from "@/lib/cloudinary";

/**
 * POST /api/admin/media/cloudinary-sign
 * 
 * Generates a signature for client-side Cloudinary uploads (Admin only).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request);
    if (!auth.authorized) {
      return auth.response;
    }

    if (auth.roleName !== "ADMIN" && auth.roleName !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { folder } = await request.json();
    const signatureData = await generateCloudinarySignature(folder || "payment-proofs");

    return NextResponse.json(signatureData);
  } catch (error) {
    console.error("Cloudinary sign error:", error);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
