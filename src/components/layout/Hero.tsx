"use client";

import Link from "next/link";
import { ArrowRight, Mountain, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black z-10" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-hikers-walking-on-a-mountain-trail-34444-large.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <Mountain className="w-3 h-3" />
            Phase 2 Launching Now
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white leading-[1.1] mb-8">
            Experience the <br />
            <span className="text-primary italic">Extraordinary</span>
          </h1>

          <p className="max-w-xl mx-auto text-lg md:text-xl text-white/70 font-body mb-10">
            From spiritual pilgrimage to rugged mountain summits, Param
            Adventure curates real stories for real explorers across India.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/experiences"
              className="group bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-primary/20"
            >
              Explore Adventures
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button className="px-8 py-4 rounded-full text-white font-bold border border-white/20 hover:bg-white/10 transition-colors">
              Our Story
            </button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Pan-India Coverage
            </div>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <div>Verified Leads</div>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <div>Group Friendly</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
