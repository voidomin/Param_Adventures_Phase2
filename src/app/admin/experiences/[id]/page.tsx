import ExperienceForm, { type ExperienceFormData } from "@/components/admin/ExperienceForm";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RichTextNode } from "@/lib/utils/rich-text";

export default async function EditExperiencePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // We fetch data directly on the server component
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: {
      categories: { select: { categoryId: true } },
    },
  });

  if (!experience) {
    notFound();
  }

  // Formatting for the form
  const initialData: ExperienceFormData = {
    ...experience,
    description: (experience.description as RichTextNode | string) || "",
    basePrice: Number(experience.basePrice), // Convert Decimal to number
    itinerary: Array.isArray(experience.itinerary)
      ? (experience.itinerary as any[])
      : [],
    images: experience.images.length > 0 ? experience.images : [""],
    coverImage: experience.coverImage || "",
    cardImage: experience.cardImage || "",
    meetingPoint: experience.meetingPoint || "",
    cancellationPolicy: experience.cancellationPolicy || "",
    maxAltitude: experience.maxAltitude || "",
    trekDistance: experience.trekDistance || "",
    bestTimeToVisit: experience.bestTimeToVisit || "",
    networkConnectivity: experience.networkConnectivity || "",
    lastAtm: experience.lastAtm || "",
    fitnessRequirement: experience.fitnessRequirement || "",
    ageRange: experience.ageRange || "",
    meetingTime: experience.meetingTime || "",
    dropoffTime: experience.dropoffTime || "",
    minAge: experience.minAge ?? null,
    maxGroupSize: experience.maxGroupSize ?? null,
    inclusions: Array.isArray(experience.inclusions)
      ? (experience.inclusions as string[])
      : [],
    exclusions: Array.isArray(experience.exclusions)
      ? (experience.exclusions as string[])
      : [],
    thingsToCarry: Array.isArray(experience.thingsToCarry)
      ? (experience.thingsToCarry as string[])
      : [],
    highlights: Array.isArray(experience.highlights)
      ? (experience.highlights as string[])
      : [],
    vibeTags: Array.isArray(experience.vibeTags)
      ? (experience.vibeTags as string[])
      : [],
    pickupPoints: Array.isArray(experience.pickupPoints)
      ? (experience.pickupPoints as string[])
      : [],
    faqs: Array.isArray(experience.faqs) ? (experience.faqs as any[]) : [],
  };

  return (
    <div>
      <ExperienceForm initialData={initialData} />
    </div>
  );
}
