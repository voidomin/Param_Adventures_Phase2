"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Mountain,
  MapPin,
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

export default function Hero({
  slides = [],
}: Readonly<{ slides?: HeroSlide[] }>) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback defaults if no slides exist in DB
  const currentSlide =
    slides.length > 0
      ? slides[currentIndex]
      : {
          id: "fallback",
          title: "Experience the\n Extraordinary",
          subtitle:
            "From spiritual pilgrimage to rugged mountain summits, Param Adventure curates real stories for real explorers across India.",
          videoUrl:
            "https://assets.mixkit.co/videos/preview/mixkit-hikers-walking-on-a-mountain-trail-34444-large.mp4",
          ctaLink: "/experiences",
        };

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000); // cycle every 6 seconds
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const isVideo = /\.(mp4|webm)$/i.test(currentSlide.videoUrl);

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden pt-16 group">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id + "-bg"}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            {isVideo ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                src={currentSlide.videoUrl}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSlide.videoUrl}
                alt={currentSlide.title}
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-black/20 text-white/50 hover:bg-black/50 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-black/20 text-white/50 hover:bg-black/50 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id + "-content"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <Mountain className="w-3 h-3" />
              Phase 2 Launching Now
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white leading-[1.1] mb-8 whitespace-pre-line drop-shadow-lg">
              {currentSlide.title.includes("Extraordinary") ? (
                <>
                  Experience the <br />
                  <span className="text-primary italic drop-shadow-md">
                    Extraordinary
                  </span>
                </>
              ) : (
                currentSlide.title
              )}
            </h1>

            <p className="max-w-xl mx-auto text-lg md:text-xl text-white/90 font-body mb-10 drop-shadow-md">
              {currentSlide.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={currentSlide.ctaLink || "/experiences"}
                className="group bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-primary/20"
              >
                Explore Adventures
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button className="px-8 py-4 rounded-full text-white font-bold border border-white/30 hover:bg-white/10 backdrop-blur-sm transition-colors">
                Our Story
              </button>
            </div>

            <div className="mt-16 flex items-center justify-center gap-8 text-white/70 text-sm font-medium drop-shadow-md">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Pan-India Coverage
              </div>
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
              <div>Verified Leads</div>
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
              <div>Group Friendly</div>
            </div>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? "w-8 h-2 bg-primary shadow-[0_0_10px_var(--primary)]"
                    : "w-2 h-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
