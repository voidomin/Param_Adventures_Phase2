"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import FloatingParticles from "./FloatingParticles";
import { FilmGrain, LightLeak } from "./AestheticOverlays";

interface AuthLayoutProps {
  readonly children: ReactNode;
  readonly heading: string;
  readonly subheading: string;
  readonly backgroundImage?: string;
  readonly settingsKey?: string; // e.g. "auth_login_bg" or "auth_register_bg"
  readonly imageHeading?: string;
  readonly imageSubheading?: string;
  readonly compact?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

export { containerVariants, itemVariants };

export default function AuthLayout({
  children,
  heading,
  subheading,
  backgroundImage = "/auth-bg.png",
  settingsKey,
  imageHeading = "Your Next\nAdventure Awaits",
  imageSubheading = "Explore breathtaking treks across India\u2019s most stunning landscapes.",
  compact = false,
}: AuthLayoutProps) {
  const [dynamicBg, setDynamicBg] = useState<string | null>(null);
  const [authSettings, setAuthSettings] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<{ text: string; author?: string | null } | null>(null);

  useEffect(() => {
    // Fetch background
    if (settingsKey) {
      fetch(`/api/settings?key=${settingsKey}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.value) setDynamicBg(data.value);
        })
        .catch(() => {});
    }

    // Fetch all auth text settings
    fetch("/api/settings/auth", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setAuthSettings(data.settings);
      })
      .catch(() => {});

    // Fetch random quote
    fetch("/api/quotes", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.quote) setQuote(data.quote);
      })
      .catch(() => {});
  }, [settingsKey]);

  // Resolve dynamic content based on page type (login vs register)
  const isLogin = settingsKey === "auth_login_bg";
  const prefix = isLogin ? "auth_login" : "auth_register";

  const displayTagline = authSettings["auth_common_tagline"] || "Curated Adventures";
  const displayImageHeading = authSettings[`${prefix}_image_heading`] || imageHeading;
  const displayImageSubheading = authSettings[`${prefix}_image_subheading`] || imageSubheading;
  const displayFormHeading = authSettings[`${prefix}_form_heading`] || heading;
  const displayFormSubheading = authSettings[`${prefix}_form_subheading`] || subheading;

  const bgSrc = dynamicBg || backgroundImage;
  const isVideo = /\.(mp4|webm|ogv)$/i.test(bgSrc) || bgSrc.includes("/video/upload/");

  return (
    <div className="min-h-screen flex bg-[#060606] selection:bg-amber-500/30">
      <FilmGrain />
      
      {/* Left — Form Side */}
      <div className={`relative w-full lg:w-[55%] flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden ${compact ? "py-4 sm:py-6" : "py-8 sm:py-12"}`}>
        <FloatingParticles />

        {/* Adventure Trail Path */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 800" fill="none">
            <motion.path
              d="M-50,150 C50,250 350,150 450,300 S150,550 450,700"
              stroke="url(#trail-gradient)"
              strokeWidth="2.5"
              strokeDasharray="6 12"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 4, ease: "easeInOut" }}
            />
            <motion.path
              d="M-50,150 C50,250 350,150 450,300 S150,550 450,700"
              stroke="#F59E0B"
              strokeWidth="3"
              strokeDasharray="0.1 200"
              strokeLinecap="round"
              animate={{ strokeDashoffset: [-200, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <defs>
              <linearGradient id="trail-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Content */}
        <motion.div
          className={`relative z-10 w-full max-w-md ${compact ? "max-w-105" : ""}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className={`flex justify-center ${compact ? "mb-3" : "mb-8 sm:mb-10"}`}>
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <motion.div
                  className="absolute -inset-1 bg-linear-to-r from-amber-500/30 to-orange-500/30 rounded-xl blur-sm"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <Image
                  src="/param-logo.png"
                  alt="Param Adventures"
                  width={36}
                  height={36}
                  className="rounded-xl relative"
                />
              </div>
              <span className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight">
                PARAM Adventures
              </span>
            </Link>
          </motion.div>

          {/* Heading */}
          <motion.div variants={itemVariants} className={`text-center ${compact ? "mb-3" : "mb-6 sm:mb-8"}`}>
            <h1 className={`font-heading font-bold text-white ${compact ? "text-xl mb-0.5" : "text-2xl sm:text-3xl mb-1.5"}`}>
              {displayFormHeading}
            </h1>
            <p className="text-white/50 text-sm">{displayFormSubheading}</p>
          </motion.div>

          {/* Form Card */}
          <motion.div variants={itemVariants} className="relative">
            {/* Animated Glow */}
            <motion.div
              className="absolute -inset-px bg-linear-to-b from-amber-500/20 via-transparent to-transparent rounded-2xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className={`relative bg-white/3 backdrop-blur-2xl border border-white/6 rounded-2xl shadow-2xl shadow-black/40 ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right — Image Side (hidden on mobile) */}
      <div className="hidden lg:block lg:w-[45%] relative overflow-hidden">
        {/* Image */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          {isVideo ? (
            <video
              src={bgSrc}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <Image
              src={bgSrc}
              alt="Adventure landscape"
              fill
              sizes="50vw"
              className="object-cover"
              priority
              quality={90}
              unoptimized={!!dynamicBg}
            />
          )}
        </motion.div>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-linear-to-r from-[#060606] via-[#060606]/50 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-[#060606]/80 via-transparent to-[#060606]/30" />
        <LightLeak />

        {/* Text over image */}
        <div className="absolute bottom-12 left-10 right-10 z-10 space-y-8">
          {/* Main Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <motion.p
              className="text-amber-400/90 text-sm font-semibold tracking-widest uppercase mb-3"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {displayTagline}
            </motion.p>
            <h2 className="text-4xl font-heading font-bold text-white leading-tight mb-3 whitespace-pre-line">
              {displayImageHeading}
            </h2>
            <p className="text-white/50 text-sm max-w-xs leading-relaxed">
              {displayImageSubheading}
            </p>
          </motion.div>

          {/* Dynamic Quote */}
          {quote && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="relative pl-6 border-l border-amber-500/30"
            >
              <div className="text-white/40 mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM14.017 21C14.017 19.8954 13.1216 19 12.017 19H9.01705C7.91248 19 7.01705 19.8954 7.01705 21V23H12.017C13.1216 23 14.017 22.1046 14.017 21ZM5.01705 21.0116V18C5.01705 15.7909 6.80791 14 9.01705 14H12.017C14.2262 14 16.017 15.7909 16.017 18V21.0116C16.017 22.1163 15.1216 23.0116 14.017 23.0116H9.01705C7.91248 23.0116 7.01705 22.1163 7.01705 21.0116Z" opacity="0"/>
                  <path d="M11.192 15.757c0-.962-.139-1.897-.412-2.805a10.05 10.05 0 00-1.03-2.31c-.443-.75-.989-1.425-1.616-2.025C7.502 8.01 6.83 7.518 6.13 7.15l-1.04-.506-.316.924c1.233.568 2.21 1.34 2.924 2.317.712.977 1.07 2.14 1.07 3.493v2.383h3.424v-.001zm10.74 0c0-.962-.139-1.897-.412-2.805a10.05 10.05 0 00-1.03-2.31c-.443-.75-.989-1.425-1.616-2.025C18.242 8.01 17.57 7.518 16.87 7.15l-1.04-.506-.316.924c1.233.568 2.21 1.34 2.924 2.317.712.977 1.07 2.14 1.07 3.493v2.383h3.424v-.001z" fill="currentColor"/>
                </svg>
              </div>
              <p className="text-white/70 text-sm font-medium italic leading-relaxed mb-2">
                &ldquo;{quote.text}&rdquo;
              </p>
              {quote.author && (
                <p className="text-amber-500/60 text-[10px] font-bold uppercase tracking-[0.2em]">
                  — {quote.author}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Floating accent lines */}
        <motion.div
          className="absolute top-1/4 right-10 w-20 h-px bg-linear-to-r from-amber-500/50 to-transparent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 1.2 }}
        />
        <motion.div
          className="absolute top-1/3 right-16 w-12 h-px bg-linear-to-r from-amber-500/30 to-transparent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        />
        <motion.div
          className="absolute bottom-1/3 right-8 w-16 h-px bg-linear-to-r from-amber-500/40 to-transparent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
        />
      </div>
    </div>
  );
}
