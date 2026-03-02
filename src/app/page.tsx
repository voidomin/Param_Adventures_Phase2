import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";
import CategoryBar from "@/components/home/CategoryBar";
import { prisma } from "@/lib/db";

export default async function Home() {
  // Fetch active hero slides for the homepage carousel
  const heroSlides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero slides={heroSlides} />
      <CategoryBar />

      <div className="py-20 max-w-7xl mx-auto px-4 text-center">
        {/* Placeholder for Featured Experience Grid */}
        <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
          Featured Experiences Coming Soon...
        </h2>
        <p className="text-foreground/60 max-w-md mx-auto">
          We are currently curating an amazing selection of trips. Stay tuned!
        </p>
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
