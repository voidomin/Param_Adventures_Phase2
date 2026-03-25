"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Mountain,
  MapPin,
  Shield,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  videoUrl: string;
  ctaLink: string | null;
}

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    title: "Experience the\n Extraordinary",
    subtitle:
      "From spiritual pilgrimage to rugged mountain summits, Param Adventure curates real stories for real explorers.",
    videoUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2670&auto=format&fit=crop",
    ctaLink: "/experiences",
  },
  {
    id: "fallback-2",
    title: "Conquer the\n Unknown",
    subtitle:
      "Push your limits with our expert-led high altitude expeditions. Safety guaranteed, adrenaline promised.",
    videoUrl:
      "https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=2603&auto=format&fit=crop",
    ctaLink: "/experiences",
  },
  {
    id: "fallback-3",
    title: "Discover Hidden\n Valleys",
    subtitle:
      "Walk through ancient forests and discover pristine glacial lakes off the beaten path.",
    videoUrl:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=2676&auto=format&fit=crop",
    ctaLink: "/experiences",
  },
];

export default function Hero({
  slides = [],
}: Readonly<{ slides?: HeroSlide[] }>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeSlides = slides.length > 0 ? slides : FALLBACK_SLIDES;
  const currentSlide = activeSlides[currentIndex];

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const activeIsVideo = /\.(mp4|webm)$/i.test(
      activeSlides[currentIndex].videoUrl,
    );
    if (activeIsVideo) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeSlides.length, currentIndex]);

  const goToPrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? activeSlides.length - 1 : prev - 1,
    );
  };
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const isVideo = /\.(mp4|webm)$/i.test(currentSlide.videoUrl);

  return (
    <section className="relative h-screen w-full flex items-end justify-center overflow-hidden pb-24 md:pb-32 bg-black group">
      {/* Film Grain Overlay */}
      <div className="absolute inset-0 z-5 pointer-events-none opacity-[0.03]">
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/40 to-black z-10" />

        <AnimatePresence>
          <motion.div
            key={currentSlide.id + "-bg"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "linear" }}
            className="absolute -inset-x-[5vw] inset-y-0 w-[110vw]"
          >
            {isVideo ? (
              <video
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                src={currentSlide.videoUrl}
                onEnded={goToNext}
              />
            ) : (
              <img
                src={currentSlide.videoUrl}
                alt={currentSlide.title}
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows - Moved to bottom-right for premium UX and to avoid content clash */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-12 right-8 md:right-16 z-30 flex items-center gap-4">
          <button
            onClick={goToPrev}
            suppressHydrationWarning
            className="p-3 rounded-full bg-white/5 text-white/50 hover:bg-primary hover:text-white backdrop-blur-md transition-all border border-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            suppressHydrationWarning
            className="p-3 rounded-full bg-white/5 text-white/50 hover:bg-primary hover:text-white backdrop-blur-md transition-all border border-white/10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Content Container with Navbar Safe Zone */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 w-full h-full flex flex-col">
        {/* Safe zone for fixed navbar */}
        <div className="h-24 md:h-32 lg:h-40 shrink-0" />

        <div className="flex-1 flex flex-col justify-end pb-32">
          <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id + "-content"}
            initial={{ opacity: 0, translateY: 60, filter: "blur(10px)" }}
            animate={{
              opacity: 1,
              filter: "blur(0px)",
              translateY: 0,
            }}
            exit={{ opacity: 0, translateY: -40, filter: "blur(10px)" }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-left"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 backdrop-blur-sm"
            >
              <Mountain className="w-3 h-3" />
              Your Odyssey Awaits
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white leading-none mb-6 whitespace-pre-line tracking-tight drop-shadow-2xl max-w-4xl">
              {currentSlide.title.includes("Extraordinary") ? (
                <>
                  Experience the <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-orange-400 to-primary italic font-serif">
                    Extraordinary
                  </span>
                </>
              ) : (
                currentSlide.title
              )}
            </h1>

            <p className="max-w-xl text-base md:text-lg text-white/80 font-body mb-8 leading-relaxed font-light">
              {currentSlide.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-start gap-4">
              <Link
                href={currentSlide.ctaLink || "/experiences"}
                className="group relative bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-black flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]"
              >
                <span className="relative z-10">Explore Adventures</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                <div className="absolute inset-0 rounded-full bg-linear-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
              </Link>

              <Link
                href="/our-story"
                className="px-8 py-4 rounded-full text-white text-base font-bold border border-white/20 hover:bg-white/10 hover:border-white/40 backdrop-blur-md transition-all"
              >
                Our Story
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-start gap-x-8 gap-y-4 text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase">
              <div className="flex items-center gap-2 group/item">
                <MapPin className="w-4 h-4 text-primary group-hover/item:scale-110 transition-transform" />
                <span>Pan-India</span>
              </div>
              <div className="w-1 h-1 bg-primary/40 rounded-full hidden md:block" />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Verified Guides</span>
              </div>
              <div className="w-1 h-1 bg-primary/40 rounded-full hidden md:block" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>Live Support</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>

      {/* Slider Indicators */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-12 left-8 md:left-16 flex items-center gap-4 z-30">
          {activeSlides.map((slide, idx) => (
            <button
              key={slide.id}
              suppressHydrationWarning
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-500 rounded-full ${
                idx === currentIndex
                  ? "w-10 h-1 bg-primary"
                  : "w-4 h-1 bg-white/20 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
