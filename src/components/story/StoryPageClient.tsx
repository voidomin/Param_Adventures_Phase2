"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Mountain,
  ChevronDown,
} from "lucide-react";

interface StoryBlock {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  stat: string | null;
  order: number;
}

function SectionReveal({
  children,
  className = "",
  delay = 0,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero Section ───────────────────────────────────── */
function StoryHero({ block }: Readonly<{ block: StoryBlock }>) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden"
    >
      {/* Parallax BG */}
      <motion.div style={{ y }} className="absolute inset-0 -top-[10%] h-[120%]">
        {block.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.imageUrl}
            alt={block.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-black via-gray-900 to-black" />
        )}
      </motion.div>

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50 z-10" />

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-20 text-center px-4 max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-sm"
        >
          <Mountain className="w-3.5 h-3.5" />
          Our Story
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white leading-[0.95] mb-6 drop-shadow-2xl"
        >
          {block.title}
        </motion.h1>

        {block.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-light"
          >
            {block.subtitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-12"
        >
          <ChevronDown className="w-8 h-8 text-white/40 mx-auto animate-bounce" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Milestone Section ──────────────────────────────── */
function MilestoneBlock({
  block,
  index,
}: Readonly<{ block: StoryBlock; index: number }>) {
  const isEven = index % 2 === 0;

  return (
    <SectionReveal className="relative">
      <div
        className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 lg:gap-16 items-center`}
      >
        {/* Image */}
        {block.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-1/2 relative group"
          >
            <div className="relative overflow-hidden rounded-3xl aspect-[4/3] shadow-2xl shadow-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.imageUrl}
                alt={block.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
            {/* Stat badge */}
            {block.stat && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className={`absolute -bottom-4 ${isEven ? "-right-4 lg:-right-6" : "-left-4 lg:-left-6"} bg-primary text-primary-foreground w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center font-heading font-black text-2xl md:text-3xl shadow-xl shadow-primary/30 rotate-3`}
              >
                {block.stat}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Text */}
        <div className="w-full lg:w-1/2 space-y-4">
          {block.stat && !block.imageUrl && (
            <span className="text-5xl font-heading font-black text-primary">
              {block.stat}
            </span>
          )}
          <h2 className="text-3xl md:text-4xl font-heading font-black text-foreground leading-tight">
            {block.title}
          </h2>
          {block.subtitle && (
            <p className="text-foreground/60 text-lg font-medium">
              {block.subtitle}
            </p>
          )}
          {block.body && (
            <p className="text-foreground/70 leading-relaxed text-base whitespace-pre-line">
              {block.body}
            </p>
          )}
        </div>
      </div>
    </SectionReveal>
  );
}

/* ─── Values Grid ────────────────────────────────────── */
function ValuesSection({ blocks }: Readonly<{ blocks: StoryBlock[] }>) {
  return (
    <section className="py-20">
      <SectionReveal className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-heading font-black text-foreground mb-4">
          What We Stand For
        </h2>
        <p className="text-foreground/60 max-w-xl mx-auto text-lg">
          The principles that guide every trail we blaze and every experience we curate.
        </p>
      </SectionReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {blocks.map((block, i) => (
          <SectionReveal key={block.id} delay={i * 0.1}>
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative bg-card border border-border rounded-3xl p-8 text-center group hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 h-full"
            >
              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                {block.stat && (
                  <div className="text-5xl mb-4">{block.stat}</div>
                )}
                <h3 className="text-xl font-heading font-black text-foreground mb-3">
                  {block.title}
                </h3>
                {block.subtitle && (
                  <p className="text-foreground/60 leading-relaxed text-sm">
                    {block.subtitle}
                  </p>
                )}
              </div>
            </motion.div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

/* ─── CTA Section ────────────────────────────────────── */
function CtaSection({ block }: Readonly<{ block: StoryBlock }>) {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <SectionReveal className="relative z-10 text-center max-w-3xl mx-auto px-4">
        <h2 className="text-4xl md:text-6xl font-heading font-black text-foreground mb-6 leading-tight">
          {block.title}
        </h2>
        {block.subtitle && (
          <p className="text-foreground/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {block.subtitle}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/experiences"
            className="group bg-primary text-primary-foreground px-10 py-4 rounded-full text-lg font-black flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]"
          >
            Explore Adventures
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/contact"
            className="px-10 py-4 rounded-full text-foreground text-base font-bold border border-border hover:bg-foreground/5 hover:border-foreground/30 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </SectionReveal>
    </section>
  );
}

/* ─── Main Client Component ──────────────────────────── */
export default function StoryPageClient({
  blocks,
}: Readonly<{ blocks: StoryBlock[] }>) {
  const heroBlock = blocks.find((b) => b.type === "hero");
  const milestoneBlocks = blocks.filter((b) => b.type === "milestone");
  const valueBlocks = blocks.filter((b) => b.type === "value");
  const ctaBlock = blocks.find((b) => b.type === "cta");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] -left-[15%] w-[50%] h-[50%] bg-primary/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-[20%] -right-[10%] w-[40%] h-[40%] bg-orange-500/3 rounded-full blur-[120px]" />
      </div>

      {/* Hero */}
      {heroBlock && <StoryHero block={heroBlock} />}

      {/* Milestones */}
      {milestoneBlocks.length > 0 && (
        <section className="relative z-10 max-w-6xl mx-auto px-4 py-20 space-y-24 md:space-y-32">
          {/* Section header */}
          <SectionReveal className="text-center">
            <span className="text-primary text-xs font-bold uppercase tracking-[0.3em]">
              The Journey
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-foreground mt-3">
              How It All Began
            </h2>
          </SectionReveal>

          {/* Timeline line */}
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent hidden lg:block" />
            <div className="space-y-20 md:space-y-28">
              {milestoneBlocks.map((block, i) => (
                <MilestoneBlock key={block.id} block={block} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      {valueBlocks.length > 0 && (
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <ValuesSection blocks={valueBlocks} />
        </div>
      )}

      {/* CTA */}
      {ctaBlock && (
        <div className="relative z-10">
          <CtaSection block={ctaBlock} />
        </div>
      )}
    </div>
  );
}
