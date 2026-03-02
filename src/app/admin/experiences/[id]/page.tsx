import ExperienceForm from "@/components/admin/ExperienceForm";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const initialData = {
    ...experience,
    basePrice: Number(experience.basePrice), // Convert Decimal to number
    itinerary: (experience.itinerary as any) || [
      { title: "", description: "" },
    ],
    images: experience.images.length > 0 ? experience.images : [""],
  };

  return (
    <div>
      <ExperienceForm initialData={initialData} />
    </div>
  );
}
