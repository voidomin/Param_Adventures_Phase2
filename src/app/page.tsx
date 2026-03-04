import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

      <Footer />
    </main>
  );
}
