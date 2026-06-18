import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { mediaFactory } from "@/lib/media/factory";
import { z } from "zod";

const mergeSchema = z.object({
  sourceId: z.string().min(1, "sourceId is required"),
  targetId: z.string().min(1, "targetId is required"),
});

function extractCloudinaryPublicId(url: string): string | null {
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;

  const pathParts = parts[1].split("/");
  if (pathParts[0].startsWith("v") && /^\d+$/.test(pathParts[0].substring(1))) {
    pathParts.shift();
  }
  const pathWithoutVersion = pathParts.join("/");
  const dotIndex = pathWithoutVersion.lastIndexOf(".");
  return dotIndex > -1 ? pathWithoutVersion.substring(0, dotIndex) : pathWithoutVersion;
}

async function deleteFromCloudStorage(url: string, type: "IMAGE" | "VIDEO") {
  try {
    const provider = await mediaFactory.getProvider();
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return false;
    }
    const host = urlObj.hostname;
    if (host === "cloudinary.com" || host.endsWith(".cloudinary.com")) {
      const publicId = extractCloudinaryPublicId(url);
      if (publicId) {
        return await provider.delete(publicId, type === "VIDEO" ? "video" : "image");
      }
    } else if (host === "amazonaws.com" || host.endsWith(".amazonaws.com") || host.includes("s3")) {
      const key = urlObj.pathname.substring(1);
      return await provider.delete(key);
    }
    return true;
  } catch (error) {
    console.error("Failed to delete duplicate from cloud storage:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, ["system:config"]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = mergeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { sourceId, targetId } = parseResult.data;

    if (sourceId === targetId) {
      return NextResponse.json(
        { error: "Source and Target images cannot be the same." },
        { status: 400 },
      );
    }

    // Retrieve both image records
    const [sourceImage, targetImage] = await Promise.all([
      prisma.image.findUnique({ where: { id: sourceId } }),
      prisma.image.findUnique({ where: { id: targetId } }),
    ]);

    if (!sourceImage || !targetImage) {
      return NextResponse.json(
        { error: "Source or Target image record not found." },
        { status: 404 },
      );
    }

    const sourceUrl = sourceImage.originalUrl;
    const targetUrl = targetImage.originalUrl;

    // Run database reference updates in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Experience cardImage / coverImage
      await tx.experience.updateMany({
        where: { cardImage: sourceUrl },
        data: { cardImage: targetUrl }
      });
      await tx.experience.updateMany({
        where: { coverImage: sourceUrl },
        data: { coverImage: targetUrl }
      });

      // 2. Update Experience images array
      const experiencesWithImg = await tx.experience.findMany({
        where: { images: { has: sourceUrl } },
        select: { id: true, images: true }
      });
      for (const exp of experiencesWithImg) {
        const updatedImages = exp.images.map(img => img === sourceUrl ? targetUrl : img);
        await tx.experience.update({
          where: { id: exp.id },
          data: { images: updatedImages }
        });
      }

      // 3. Update Blog coverImageId / coverImageUrl
      await tx.blog.updateMany({
        where: { coverImageId: sourceId },
        data: { coverImageId: targetId }
      });
      await tx.blog.updateMany({
        where: { coverImageUrl: sourceUrl },
        data: { coverImageUrl: targetUrl }
      });

      // 4. Update StoryBlock imageUrl
      await tx.storyBlock.updateMany({
        where: { imageUrl: sourceUrl },
        data: { imageUrl: targetUrl }
      });

      // 5. Update TripLog photoUrls array
      const tripLogsWithImg = await tx.tripLog.findMany({
        where: { photoUrls: { has: sourceUrl } },
        select: { id: true, photoUrls: true }
      });
      for (const tl of tripLogsWithImg) {
        const updatedPhotos = tl.photoUrls.map(img => img === sourceUrl ? targetUrl : img);
        await tx.tripLog.update({
          where: { id: tl.id },
          data: { photoUrls: updatedPhotos }
        });
      }

      // 6. Update User avatarUrl
      await tx.user.updateMany({
        where: { avatarUrl: sourceUrl },
        data: { avatarUrl: targetUrl }
      });

      // 7. Update HeroSlide videoUrl references
      await tx.heroSlide.updateMany({
        where: { videoUrl: sourceUrl },
        data: { videoUrl: targetUrl }
      });

      // 8. Update PlatformSetting value references
      await tx.platformSetting.updateMany({
        where: { value: sourceUrl },
        data: { value: targetUrl }
      });

      // 9. Delete the duplicate Image record
      await tx.image.delete({
        where: { id: sourceId }
      });
    });

    // Delete the actual file from cloud storage asynchronously after successful DB update
    const cloudDeleteSuccess = await deleteFromCloudStorage(sourceUrl, sourceImage.type);

    return NextResponse.json({
      success: true,
      message: "Media references merged and duplicate deleted successfully.",
      cloudDeleteSuccess,
    });

  } catch (error: unknown) {
    console.error("Merge media error:", error);
    return NextResponse.json(
      { error: "Failed to merge media references" },
      { status: 500 },
    );
  }
}
