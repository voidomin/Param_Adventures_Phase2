import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { mediaFactory } from "@/lib/media/factory";
import { logActivity } from "@/lib/audit-logger";
import { isCloudinaryUrl, isS3Url } from "@/lib/utils/url-safety";

async function deleteFromCloudStorage(url: string, type: "IMAGE" | "VIDEO") {
  try {
    const provider = await mediaFactory.getProvider();
    let deleted = true;
    if (isCloudinaryUrl(url)) {
      const parts = url.split("/upload/");
      if (parts.length >= 2) {
        const pathParts = parts[1].split("/");
        // Remove version part (e.g. v1774883043)
        if (pathParts[0].startsWith("v") && /^\d+$/.test(pathParts[0].substring(1))) {
          pathParts.shift();
        }
        const pathWithoutVersion = pathParts.join("/");
        const dotIndex = pathWithoutVersion.lastIndexOf(".");
        const publicId = dotIndex > -1 ? pathWithoutVersion.substring(0, dotIndex) : pathWithoutVersion;
        deleted = await provider.delete(publicId, type === "VIDEO" ? "video" : "image");
      }
    } else if (isS3Url(url)) {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);
      deleted = await provider.delete(key);
    }
    return deleted;
  } catch (error) {
    console.error("Failed to delete from cloud storage:", error);
    return false;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Retrieve image record
    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from Cloud/S3 storage dynamically using resolved provider client
    const deleteSuccess = await deleteFromCloudStorage(image.originalUrl, image.type);

    // Remove it from our DB
    await prisma.image.delete({
      where: { id },
    });

    await logActivity(
      "MEDIA_DELETED",
      auth.userId,
      "Image",
      id,
      { url: image.originalUrl, type: image.type }
    );

    return NextResponse.json({ success: true, deleteSuccess });
  } catch (error: unknown) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 },
    );
  }
}
