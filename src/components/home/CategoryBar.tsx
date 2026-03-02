"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Mountain,
  Tent,
  Flame,
  Building2,
  MapPin,
  Waves,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || categories.length === 0) return;

    // Initial check after render
    const timer = setTimeout(checkScroll, 100);

    el.addEventListener("scroll", checkScroll, { passive: true });
    globalThis.addEventListener("resize", checkScroll);

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", checkScroll);
      globalThis.removeEventListener("resize", checkScroll);
    };
  }, [categories, checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollAmount = 300;

    if (direction === "right" && !canScrollRight) {
      // Wrap around to the start
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction === "left" && !canScrollLeft) {
      // Wrap around to the end
      el.scrollTo({
        left: el.scrollWidth - el.clientWidth,
        behavior: "smooth",
      });
    } else {
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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

  // Duplicate items for the infinite-feel loop
  const allItems = [
    { id: "all", name: "All Adventures", slug: "all" },
    ...categories,
    ...categories, // duplicate for infinite scroll illusion
  ];

  return (
    <div className="w-full bg-slate-900 border-b border-white/5 sticky top-16 z-30">
      <div className="relative max-w-7xl mx-auto group">
        {/* Left gradient fade + arrow */}
        <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
          <button
            onClick={() => scroll("left")}
            className="relative ml-1 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto no-scrollbar py-4 px-12 gap-3"
        >
          {allItems.map((item, index) => {
            const isAll = item.slug === "all";
            const Icon = isAll ? null : CATEGORY_ICONS[item.slug] || MapPin;
            const isActive = activeCategory === item.slug;

            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => setActiveCategory(item.slug)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 scale-105"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white font-medium"
                }`}
              >
                {Icon && (
                  <Icon className={`w-4 h-4 ${isActive ? "" : "opacity-70"}`} />
                )}
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Right gradient fade + arrow */}
        <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center">
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
          <button
            onClick={() => scroll("right")}
            className="relative mr-1 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
