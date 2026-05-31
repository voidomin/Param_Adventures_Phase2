import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch images uploaded by administrative roles
    const [images, experiences, blogs, storyBlocks, tripLogs, users, heroSlides, platformSettings] = await Promise.all([
      prisma.image.findMany({
        where: {
          uploadedBy: {
            role: {
              name: {
                in: ["SUPER_ADMIN", "ADMIN", "TRIP_MANAGER"],
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.experience.findMany({ select: { id: true, title: true, cardImage: true, coverImage: true, images: true } }),
      prisma.blog.findMany({ select: { id: true, title: true, coverImageUrl: true, coverImageId: true } }),
      prisma.storyBlock.findMany({ select: { id: true, title: true, imageUrl: true } }),
      prisma.tripLog.findMany({ select: { id: true, photoUrls: true } }),
      prisma.user.findMany({ select: { id: true, name: true, avatarUrl: true } }),
      prisma.heroSlide.findMany({ select: { id: true, title: true, videoUrl: true } }),
      prisma.platformSetting.findMany({ select: { key: true, value: true } })
    ]);

    const imagesWithUsages = images.map(img => {
      const usages: { type: string; id: string; name: string }[] = [];
      
      // 1. Experiences
      for (const exp of experiences) {
        if (exp.cardImage === img.originalUrl) {
          usages.push({ type: "Experience Card", id: exp.id, name: exp.title });
        }
        if (exp.coverImage === img.originalUrl) {
          usages.push({ type: "Experience Cover", id: exp.id, name: exp.title });
        }
        if (exp.images.includes(img.originalUrl)) {
          usages.push({ type: "Experience Gallery", id: exp.id, name: exp.title });
        }
      }
      
      // 2. Blogs
      for (const blog of blogs) {
        if (blog.coverImageId === img.id || blog.coverImageUrl === img.originalUrl) {
          usages.push({ type: "Blog Cover", id: blog.id, name: blog.title });
        }
      }
      
      // 3. StoryBlocks
      for (const sb of storyBlocks) {
        if (sb.imageUrl === img.originalUrl) {
          usages.push({ type: "Story Block", id: sb.id, name: sb.title });
        }
      }
      
      // 4. TripLogs
      for (const tl of tripLogs) {
        if (tl.photoUrls.includes(img.originalUrl)) {
          usages.push({ type: "Trip Log Photo", id: tl.id, name: `Log for Slot ${tl.id}` });
        }
      }
      
      // 5. Users
      for (const u of users) {
        if (u.avatarUrl === img.originalUrl) {
          usages.push({ type: "User Avatar", id: u.id, name: u.name });
        }
      }

      // 6. Hero Slides
      for (const slide of heroSlides) {
        if (slide.videoUrl === img.originalUrl) {
          usages.push({ type: "Hero Slide", id: slide.id, name: slide.title });
        }
      }

      // 7. System Settings
      for (const setting of platformSettings) {
        if (setting.value === img.originalUrl) {
          usages.push({ type: "System Setting", id: setting.key, name: setting.key });
        }
      }

      return {
        ...img,
        usages,
        usageCount: usages.length
      };
    });

    return NextResponse.json({ images: imagesWithUsages });
  } catch (error: unknown) {
    console.error("Fetch media error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media library" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const mediaCreateSchema = z.object({
  originalUrl: z.string().refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "originalUrl must be a valid URL" },
  ),
  type: z.enum(["IMAGE", "VIDEO"]).optional().default("IMAGE"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request, [
      "trip:create",
      "system:config",
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // ─── Validation ──────────────────────────────────────
    const parseResult = mediaCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 },
      );
    }
    const { originalUrl, type } = parseResult.data;

    // Check for existing image with same URL to prevent duplicates
    const existing = await prisma.image.findFirst({
      where: { originalUrl },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const image = await prisma.image.create({
      data: {
        originalUrl,
        type,
        uploadedById: auth.userId,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error: unknown) {
    console.error("Save media error:", error);
    return NextResponse.json(
      { error: "Failed to save media record" },
      { status: 500 },
    );
  }
}
