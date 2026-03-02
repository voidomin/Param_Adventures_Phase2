import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import ExperienceCard from "@/components/experiences/ExperienceCard";

export const revalidate = 60; // Revalidate every minute

export default async function ExperiencesPage() {
  const experiences = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      categories: {
        include: { category: true },
      },
    },
  });

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-card w-full pt-32 pb-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-black text-foreground mb-4">
            Curated <span className="text-primary italic">Adventures</span>
          </h1>
          <p className="text-foreground/70 max-w-2xl mx-auto text-lg">
            Discover our hand-picked collection of treks, spiritual journeys,
            and immersive experiences across India.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 w-full py-12">
        {/* Simple Filters Placeholder */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4 border-b border-border pb-6">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-bold">
              All Trips
            </button>
            <button className="px-4 py-2 bg-foreground/5 text-foreground hover:bg-foreground/10 rounded-full text-sm font-medium transition-colors">
              Trekking
            </button>
            <button className="px-4 py-2 bg-foreground/5 text-foreground hover:bg-foreground/10 rounded-full text-sm font-medium transition-colors">
              Spiritual
            </button>
            <button className="px-4 py-2 bg-foreground/5 text-foreground hover:bg-foreground/10 rounded-full text-sm font-medium transition-colors">
              Cultural
            </button>
          </div>
          <div className="text-sm text-foreground/60 font-medium">
            Showing {experiences.length} trips
          </div>
        </div>

        {experiences.length === 0 ? (
          <div className="text-center py-20 text-foreground/50">
            <h3 className="text-xl font-bold text-foreground mb-2">
              No experiences found
            </h3>
            <p>Check back later or adjust your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((exp: any) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        )}
      </div>

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
