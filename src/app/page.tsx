import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background">
      <Navbar />
      <Hero />

      {/* Category Selection Placeholder */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
              Choose Your Path
            </h2>
            <p className="text-foreground/60 max-w-md">
              Discover curated journeys across seven unique categories, from
              tranquil temples to mountain peaks.
            </p>
          </div>
          <button className="text-primary font-bold flex items-center gap-2 group mt-6 md:mt-0">
            View All Categories
            <div className="w-8 h-[2px] bg-primary group-hover:w-12 transition-all" />
          </button>
        </div>

        {/* Placeholder for Dynamic Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            "Trekking",
            "Spiritual",
            "Corporate",
            "Camping",
            "City Tours",
            "Educational",
            "Events",
          ].map((cat) => (
            <div
              key={cat}
              className="group cursor-pointer bg-card border border-border p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:border-primary transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                {/* Icons placeholder */}
                <div className="w-6 h-6 border-2 border-current rounded-sm" />
              </div>
              <span className="text-sm font-bold tracking-tight">{cat}</span>
            </div>
          ))}
        </div>
      </section>

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
