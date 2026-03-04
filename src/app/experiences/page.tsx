import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import ExperiencesClient from "./ExperiencesClient";

export const revalidate = 60; // Revalidate every minute

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ExperiencesPage({
  searchParams,
}: Readonly<Props>) {
  const params = await searchParams;
  const initialFilter = (params?.category as string) || "all";

  const experiences = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      categories: {
        include: { category: true },
      },
    },
  });

  const dbCategories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const serializedCategories = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  // Serialize Prisma objects to plain JS objects for Client Component
  const serializedExperiences = experiences.map((exp) => ({
    id: exp.id,
    title: exp.title,
    slug: exp.slug,
    description: exp.description,
    durationDays: exp.durationDays,
    location: exp.location,
    basePrice: Number(exp.basePrice),
    capacity: exp.capacity,
    difficulty: exp.difficulty,
    status: exp.status,
    images: exp.images,
    createdAt: exp.createdAt.toISOString(),
    updatedAt: exp.updatedAt.toISOString(),
    startDate: exp.startDate?.toISOString() || null,
    endDate: exp.endDate?.toISOString() || null,
    categories: exp.categories.map((c) => ({
      category: {
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
      },
    })),
  }));

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <ExperiencesClient
        initialExperiences={serializedExperiences as any}
        categories={serializedCategories}
        initialFilter={initialFilter}
      />

      {/* Footer Placeholder */}
      <footer className="bg-black py-16 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            © 2026 Param Adventure. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
