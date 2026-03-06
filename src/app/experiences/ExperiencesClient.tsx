"use client";

import { useState, useMemo, useRef } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
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
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

type DifficultyLevel = "EASY" | "MODERATE" | "HARD" | "EXTREME";

interface Experience {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationDays: number;
  location: string;
  basePrice: number;
  capacity: number;
  difficulty: DifficultyLevel;
  status: string;
  images: string[];
  categories: Category[];
  slotsCount?: number;
}

const DIFFICULTIES: { value: DifficultyLevel; label: string; color: string }[] =
  [
    {
      value: "EASY",
      label: "Easy",
      color:
        "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20",
    },
    {
      value: "MODERATE",
      label: "Moderate",
      color:
        "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20",
    },
    {
      value: "HARD",
      label: "Hard",
      color:
        "bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20",
    },
    {
      value: "EXTREME",
      label: "Extreme",
      color: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20",
    },
  ];

type SortOption =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "duration_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "duration_asc", label: "Duration: Shortest" },
  { value: "duration_desc", label: "Duration: Longest" },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState<
    DifficultyLevel[]
  >([]);
  const [minDays, setMinDays] = useState("");
  const [maxDays, setMaxDays] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [hasSlots, setHasSlots] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Auto-detect price range from data (for placeholder display)
  const priceExtent = useMemo(() => {
    if (initialExperiences.length === 0) return [0, 100000] as [number, number];
    const prices = initialExperiences.map((e) => e.basePrice);
    return [Math.min(...prices), Math.max(...prices)] as [number, number];
  }, [initialExperiences]);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const toggleDifficulty = (diff: DifficultyLevel) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff],
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedDifficulties.length > 0) count++;
    if (minDays || maxDays) count++;
    if (minPrice || maxPrice) count++;
    if (hasSlots) count++;
    return count;
  }, [
    searchQuery,
    selectedDifficulties,
    minDays,
    maxDays,
    minPrice,
    maxPrice,
    hasSlots,
  ]);

  const clearAll = () => {
    setSearchQuery("");
    setSelectedDifficulties([]);
    setMinDays("");
    setMaxDays("");
    setMinPrice("");
    setMaxPrice("");
    setHasSlots(false);
    setSortBy("recommended");
    setActiveFilter("all");
  };

  // --- FILTERING PIPELINE ---
  const filteredExperiences = useMemo(() => {
    let results = initialExperiences;

    // 1. Category
    if (activeFilter !== "all") {
      results = results.filter((exp) =>
        exp.categories.some((c) => c.category.slug === activeFilter),
      );
    }

    // 2. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (exp) =>
          exp.title.toLowerCase().includes(q) ||
          exp.location.toLowerCase().includes(q),
      );
    }

    // 3. Difficulty
    if (selectedDifficulties.length > 0) {
      results = results.filter((exp) =>
        selectedDifficulties.includes(exp.difficulty),
      );
    }

    // 4. Duration range
    const min = parseInt(minDays);
    const max = parseInt(maxDays);
    if (!isNaN(min)) {
      results = results.filter((exp) => exp.durationDays >= min);
    }
    if (!isNaN(max)) {
      results = results.filter((exp) => exp.durationDays <= max);
    }

    // 5. Price range
    const pMin = parseFloat(minPrice);
    const pMax = parseFloat(maxPrice);
    if (!isNaN(pMin)) {
      results = results.filter((exp) => exp.basePrice >= pMin);
    }
    if (!isNaN(pMax)) {
      results = results.filter((exp) => exp.basePrice <= pMax);
    }

    // 6. Has upcoming slots
    if (hasSlots) {
      results = results.filter((exp) => (exp.slotsCount ?? 0) > 0);
    }

    // 7. Sort
    const sorted = [...results];
    switch (sortBy) {
      case "price_asc":
        sorted.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case "duration_asc":
        sorted.sort((a, b) => a.durationDays - b.durationDays);
        break;
      case "duration_desc":
        sorted.sort((a, b) => b.durationDays - a.durationDays);
        break;
    }

    return sorted;
  }, [
    initialExperiences,
    activeFilter,
    searchQuery,
    selectedDifficulties,
    minDays,
    maxDays,
    minPrice,
    maxPrice,
    hasSlots,
    sortBy,
  ]);

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
      {/* Hero */}
      <div className="relative w-full pt-32 pb-24 flex items-center justify-center overflow-hidden min-h-[50vh] bg-black">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-black to-black opacity-80" />
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

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 w-full py-12 relative">
        {/* Sticky Filter Bar */}
        <div className="sticky top-[72px] z-40 mb-8 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm rounded-b-2xl px-4 pt-4 pb-2 transition-all">
          {/* Row 1: Categories + Search + Sort */}
          <div className="flex items-center gap-3 mb-3">
            {/* Category Pills with Scroll Arrows */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => scrollCategories("left")}
                className="shrink-0 w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                ref={categoryScrollRef}
                className="flex gap-2 overflow-x-auto no-scrollbar flex-1 mask-linear-fade pb-1 scroll-smooth"
              >
                {[
                  { id: "all", name: "All Trips", slug: "all" },
                  ...categories,
                ].map((filter) => (
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
                ))}
              </div>
              <button
                onClick={() => scrollCategories("right")}
                className="shrink-0 w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-foreground/5 border border-border rounded-full text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-48 transition-all focus:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-foreground/5 text-foreground/70 border-transparent hover:bg-foreground/10"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap bg-foreground/5 text-foreground/70 hover:bg-foreground/10 transition-all border border-transparent"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden md:inline">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl z-50 py-2 min-w-[200px]">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setShowSortMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === opt.value
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-foreground/70 hover:bg-foreground/5"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Search (visible on small screens) */}
          <div className="sm:hidden mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-foreground/5 border border-border rounded-full text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Row 2: Advanced Filters (collapsible) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-t border-border">
                  {/* Difficulty */}
                  <div>
                    <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">
                      Difficulty
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTIES.map((diff) => (
                        <button
                          key={diff.value}
                          onClick={() => toggleDifficulty(diff.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            selectedDifficulties.includes(diff.value)
                              ? diff.color +
                                " ring-2 ring-offset-1 ring-current"
                              : "bg-foreground/5 text-foreground/50 border-transparent hover:bg-foreground/10"
                          }`}
                        >
                          {diff.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Range */}
                  <div>
                    <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">
                      Duration (Days)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Min"
                        value={minDays}
                        onChange={(e) => setMinDays(e.target.value)}
                        className="w-20 px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"
                      />
                      <span className="text-foreground/30 text-sm">—</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="Max"
                        value={maxDays}
                        onChange={(e) => setMaxDays(e.target.value)}
                        className="w-20 px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"
                      />
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">
                      Price Range (₹)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder={`Min (${priceExtent[0].toLocaleString("en-IN")})`}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-28 px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"
                      />
                      <span className="text-foreground/30 text-sm">—</span>
                      <input
                        type="number"
                        min={0}
                        placeholder={`Max (${priceExtent[1].toLocaleString("en-IN")})`}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-28 px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"
                      />
                    </div>
                  </div>

                  {/* Availability + Clear */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">
                        Availability
                      </label>
                      <button
                        onClick={() => setHasSlots((v) => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                          hasSlots
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-foreground/5 text-foreground/50 border-transparent hover:bg-foreground/10"
                        }`}
                      >
                        <CalendarCheck className="w-4 h-4" />
                        Has Upcoming Dates
                      </button>
                    </div>

                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-all self-start"
                      >
                        <X className="w-4 h-4" />
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <div className="flex items-center justify-between py-2">
            <motion.div
              key={filteredExperiences.length}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-foreground/60 font-medium"
            >
              Showing {filteredExperiences.length} trip
              {filteredExperiences.length !== 1 && "s"}
            </motion.div>
          </div>
        </div>

        {/* Grid */}
        {filteredExperiences.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-foreground/50"
          >
            <h3 className="text-2xl font-bold text-foreground mb-2 font-heading">
              No experiences found
            </h3>
            <p className="text-lg mb-6">
              Try adjusting your filters or search query.
            </p>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:scale-105 transition-transform"
            >
              Clear All Filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`${activeFilter}-${sortBy}`}
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
