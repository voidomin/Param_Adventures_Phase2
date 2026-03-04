"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import {
  Mountain,
  Tent,
  Flame,
  Building2,
  MapPin,
  Waves,
  Compass,
  Sun,
  Trees,
  Bike,
  Camera,
  Coffee,
  Anchor,
  Leaf,
  Wind,
  Zap,
  Star,
  Globe,
  Heart,
  Shield,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Mountain,
  Tent,
  Flame,
  Building2,
  MapPin,
  Waves,
  Compass,
  Sun,
  Trees,
  Bike,
  Camera,
  Coffee,
  Anchor,
  Leaf,
  Wind,
  Zap,
  Star,
  Globe,
  Heart,
  Shield,
};

function DynamicIcon({
  name,
  className,
}: Readonly<{ name?: string | null; className?: string }>) {
  const Icon = name && ICON_MAP[name] ? ICON_MAP[name] : null;
  if (!Icon) return null;
  return <Icon className={className} />;
}

interface Category {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface DBCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

interface Experience {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationDays: number;
  location: string;
  basePrice: number;
  capacity: number;
  difficulty: "EASY" | "MODERATE" | "HARD" | "EXTREME";
  status: string;
  images: string[];
  categories: Category[];
}

export default function ExperiencesClient({
  initialExperiences,
  categories,
  initialFilter,
}: Readonly<{
  initialExperiences: Experience[];
  categories: DBCategory[];
  initialFilter: string;
}>) {
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  const filteredExperiences =
    activeFilter === "all"
      ? initialExperiences
      : initialExperiences.filter((exp) =>
          exp.categories.some((c) => c.category.slug === activeFilter),
        );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(5px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <>
      <div className="relative w-full pt-32 pb-24 flex items-center justify-center overflow-hidden min-h-[50vh] bg-black">
        {/* Abstract Cinematic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-black to-black opacity-80" />
          {/* Subtle noise/texture effect */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'url(\'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E\')',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 max-w-7xl mx-auto px-4 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest mb-6"
          >
            Explore
          </motion.div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white mb-6 drop-shadow-xl tracking-tight leading-[1.1]">
            Curated <br className="md:hidden" />
            <span className="text-primary italic drop-shadow-md">
              Adventures
            </span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-lg md:text-xl font-body">
            Discover our hand-picked collection of treks, spiritual journeys,
            and immersive experiences across India.
          </p>
        </motion.div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 w-full py-12 relative">
        {/* Sticky Glassmorphic Filter Bar */}
        <div className="sticky top-[72px] z-40 flex flex-wrap items-center justify-between mb-8 gap-4 pb-4 pt-4 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm rounded-b-2xl px-2 transition-all">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
            {[{ id: "all", name: "All Trips", slug: "all" }, ...categories].map(
              (filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.slug)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                    activeFilter === filter.slug
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                      : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
                  }`}
                >
                  {filter.slug !== "all" && (
                    <DynamicIcon name={filter.icon} className="w-4 h-4" />
                  )}
                  {filter.name}
                </button>
              ),
            )}
          </div>
          <motion.div
            key={filteredExperiences.length}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-sm text-foreground/60 font-medium px-2 whitespace-nowrap"
          >
            Showing {filteredExperiences.length} trip
            {filteredExperiences.length !== 1 && "s"}
          </motion.div>
        </div>

        {filteredExperiences.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-foreground/50"
          >
            <h3 className="text-2xl font-bold text-foreground mb-2 font-heading">
              No experiences found
            </h3>
            <p className="text-lg">
              Check back later or try adjusting your filters.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={activeFilter}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {filteredExperiences.map((exp: any) => (
              <motion.div key={exp.id} variants={itemVariants}>
                <ExperienceCard experience={exp} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
