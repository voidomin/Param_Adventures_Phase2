import ExperienceForm, { 
  type ExperienceFormData, 
  type ItineraryDay, 
  type FAQ 
} from "@/components/admin/ExperienceForm";
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
    description: experience.description || "",
    basePrice: Number(experience.basePrice), // Convert Decimal to number
    itinerary: Array.isArray(experience.itinerary)
      ? (experience.itinerary as unknown as ItineraryDay[])
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
    highlights: experience.highlights,
    vibeTags: experience.vibeTags,
    pickupPoints: experience.pickupPoints,
    faqs: Array.isArray(experience.faqs) ? (experience.faqs as unknown as FAQ[]) : [],
  };

  return (
    <div>
      <ExperienceForm initialData={initialData} />
    </div>
  );
}
