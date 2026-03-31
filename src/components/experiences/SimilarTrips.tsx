import { prisma } from "@/lib/db";
import Link from "next/link";
import { MapPin, IndianRupee, Clock } from "lucide-react";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media/media-gateway";

interface SimilarTripsProps {
  currentExperienceId: string;
  categoryIds: string[];
  mediaSettings?: any;
}

export default async function SimilarTrips({
  currentExperienceId,
  categoryIds,
  mediaSettings,
}: Readonly<SimilarTripsProps>) {
  if (!categoryIds || categoryIds.length === 0) return null;

  let similarExperiences;
  try {
    similarExperiences = await prisma.experience.findMany({
      where: {
        id: { not: currentExperienceId },
        status: "PUBLISHED",
        categories: {
          some: { categoryId: { in: categoryIds } },
        },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        location: true,
        durationDays: true,
        basePrice: true,
        cardImage: true,
        coverImage: true,
        images: true,
      },
    });
  } catch (err) {
    console.error("Error fetching similar trips:", err);
    return null;
  }

  if (similarExperiences.length === 0) return null;

  return (
    <div className="mt-10">
      <h4 className="text-xl font-heading font-black mb-4">
        You Might Also Like
      </h4>
      <div className="space-y-4">
        {similarExperiences.map((exp) => (
          <Link
            key={exp.id}
            href={`/experiences/${exp.slug}`}
            className="group flex gap-4 bg-card border border-border rounded-2xl p-3 hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 relative">
              <Image
                src={getMediaUrl(
                  exp.cardImage || exp.coverImage || exp.images?.[0] || "/placeholder.jpg",
                  mediaSettings?.provider || "CLOUDINARY",
                  {
                    cloudinaryCloudName: mediaSettings?.cloudinaryCloudName,
                    s3Bucket: mediaSettings?.s3Bucket,
                    s3Region: mediaSettings?.s3Region,
                    globalQuality: mediaSettings?.globalQuality || 95,
                    highFidelity: mediaSettings?.highFidelity ?? true
                  },
                  { width: 200, crop: "fill" }
                )}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h5 className="font-bold text-foreground text-sm leading-tight truncate mb-1.5 group-hover:text-primary transition-colors">
                {exp.title}
              </h5>
              <div className="flex items-center gap-4 text-xs font-medium text-foreground/50">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[80px]">{exp.location}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {exp.durationDays}D
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-foreground flex items-center">
                <IndianRupee className="w-3 h-3 text-primary" />
                {Number(exp.basePrice).toLocaleString("en-IN")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
