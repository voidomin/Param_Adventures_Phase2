import { NextResponse, NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

interface ImageUsage {
  type: string;
  id: string;
  name: string;
}

interface UsageLookupData {
  experiences: { id: string; title: string; cardImage: string | null; coverImage: string | null; images: string[] }[];
  blogs: { id: string; title: string; coverImageUrl: string | null; coverImageId: string | null }[];
  storyBlocks: { id: string; title: string; imageUrl: string | null }[];
  tripLogs: { id: string; photoUrls: string[] }[];
  users: { id: string; name: string; avatarUrl: string | null }[];
  heroSlides: { id: string; title: string; videoUrl: string | null }[];
  platformSettings: { key: string; value: string | null }[];
}

function checkExperienceUsages(url: string, experiences: UsageLookupData["experiences"], usages: ImageUsage[]) {
  for (const exp of experiences) {
    if (exp.cardImage === url) {
      usages.push({ type: "Experience Card", id: exp.id, name: exp.title });
    }
    if (exp.coverImage === url) {
      usages.push({ type: "Experience Cover", id: exp.id, name: exp.title });
    }
    if (exp.images.includes(url)) {
      usages.push({ type: "Experience Gallery", id: exp.id, name: exp.title });
    }
  }
}

function checkBlogUsages(imgId: string, url: string, blogs: UsageLookupData["blogs"], usages: ImageUsage[]) {
  for (const blog of blogs) {
    if (blog.coverImageId === imgId || blog.coverImageUrl === url) {
      usages.push({ type: "Blog Cover", id: blog.id, name: blog.title });
    }
  }
}

function checkStoryBlockUsages(url: string, storyBlocks: UsageLookupData["storyBlocks"], usages: ImageUsage[]) {
  for (const sb of storyBlocks) {
    if (sb.imageUrl === url) {
      usages.push({ type: "Story Block", id: sb.id, name: sb.title });
    }
  }
}

function checkTripLogUsages(url: string, tripLogs: UsageLookupData["tripLogs"], usages: ImageUsage[]) {
  for (const tl of tripLogs) {
    if (tl.photoUrls.includes(url)) {
      usages.push({ type: "Trip Log Photo", id: tl.id, name: `Log for Slot ${tl.id}` });
    }
  }
}

function checkUserUsages(url: string, users: UsageLookupData["users"], usages: ImageUsage[]) {
  for (const u of users) {
    if (u.avatarUrl === url) {
      usages.push({ type: "User Avatar", id: u.id, name: u.name });
    }
  }
}

function checkHeroSlideUsages(url: string, heroSlides: UsageLookupData["heroSlides"], usages: ImageUsage[]) {
  for (const slide of heroSlides) {
    if (slide.videoUrl === url) {
      usages.push({ type: "Hero Slide", id: slide.id, name: slide.title });
    }
  }
}

function checkSettingUsages(url: string, platformSettings: UsageLookupData["platformSettings"], usages: ImageUsage[]) {
  for (const setting of platformSettings) {
    if (setting.value === url) {
      usages.push({ type: "System Setting", id: setting.key, name: setting.key });
    }
  }
}

function getImageUsages(
  img: { id: string; originalUrl: string },
  data: UsageLookupData
): ImageUsage[] {
  const usages: ImageUsage[] = [];
  const url = img.originalUrl;

  checkExperienceUsages(url, data.experiences, usages);
  checkBlogUsages(img.id, url, data.blogs, usages);
  checkStoryBlockUsages(url, data.storyBlocks, usages);
  checkTripLogUsages(url, data.tripLogs, usages);
  checkUserUsages(url, data.users, usages);
  checkHeroSlideUsages(url, data.heroSlides, usages);
  checkSettingUsages(url, data.platformSettings, usages);

  return usages;
}

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
      const usages = getImageUsages(img, {
        experiences,
        blogs,
        storyBlocks,
        tripLogs,
        users,
        heroSlides,
        platformSettings
      });

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
