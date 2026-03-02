"use client";

import { useEffect, useState } from "react";
import { Mountain, Tent, Flame, Building2, MapPin, Waves } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  trekking: Mountain,
  camping: Tent,
  spiritual: Flame,
  corporate: Building2,
  "city-tours": MapPin,
  "water-sports": Waves,
};

export default function CategoryBar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>("all");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (res.ok) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-slate-900 border-b border-white/5 py-4 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-10 w-32 bg-white/5 rounded-full flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 border-b border-white/5 sticky top-16 z-30">
      <div className="max-w-7xl mx-auto">
        <div className="flex overflow-x-auto no-scrollbar py-4 px-4 gap-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 ${
              activeCategory === "all"
                ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 scale-105"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white font-medium"
            }`}
          >
            All Adventures
          </button>

          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] || MapPin;
            const isActive = activeCategory === category.slug;

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.slug)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 scale-105"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white font-medium"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "" : "opacity-70"}`} />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
