import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";
import CategoryBar from "@/components/home/CategoryBar";
import { prisma } from "@/lib/db";
import ExperienceCard from "@/components/experiences/ExperienceCard";

export default async function Home() {
  // Fetch active hero slides for the homepage carousel
  const heroSlides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  // Fetch featured experiences
  const featuredExperiences = await prisma.experience.findMany({
    where: { isFeatured: true, status: "PUBLISHED" },
    include: {
      categories: { include: { category: true } },
      _count: { select: { slots: true } },
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero slides={heroSlides} />
      <CategoryBar />

      <div className="py-20 max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-heading font-black text-foreground mb-4 text-center">
          Featured Experiences
        </h2>
        <p className="text-foreground/60 max-w-2xl mx-auto text-center mb-12">
          Discover our hand-picked, most extraordinary adventures designed for
          the bold.
        </p>

        {featuredExperiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredExperiences.map((exp: any) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-foreground/60">
              We are currently curating an amazing selection of featured trips.
              Stay tuned!
            </p>
          </div>
        )}
      </div>

      {/* Footer Placeholder */}
      <footer className="bg-black py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white/30 text-sm">
            © 2026 Param Adventure. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
