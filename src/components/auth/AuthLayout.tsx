"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import FloatingParticles from "./FloatingParticles";

interface AuthLayoutProps {
  children: ReactNode;
  heading: string;
  subheading: string;
  backgroundImage?: string;
  settingsKey?: string; // e.g. "auth_login_bg" or "auth_register_bg"
  imageHeading?: string;
  imageSubheading?: string;
  compact?: boolean;
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

  useEffect(() => {
    if (!settingsKey) return;
    fetch(`/api/settings?key=${settingsKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.value) setDynamicBg(data.value);
      })
      .catch(() => {});
  }, [settingsKey]);

  const bgSrc = dynamicBg || backgroundImage;
  const isVideo = /\.(mp4|webm|ogv)$/i.test(bgSrc) || bgSrc.includes("/video/upload/");

  return (
    <div className="min-h-screen flex bg-[#060606]">
      {/* Left — Form Side */}
      <div className={`relative w-full lg:w-[55%] flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden ${compact ? "py-4 sm:py-6" : "py-8 sm:py-12"}`}>
        <FloatingParticles />

        {/* Content */}
        <motion.div
          className={`relative z-10 w-full max-w-md ${compact ? "max-w-[420px]" : ""}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className={`flex justify-center ${compact ? "mb-3" : "mb-8 sm:mb-10"}`}>
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-xl blur-sm"
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
              {heading}
            </h1>
            <p className="text-white/50 text-sm">{subheading}</p>
          </motion.div>

          {/* Form Card */}
          <motion.div variants={itemVariants} className="relative">
            {/* Animated Glow */}
            <motion.div
              className="absolute -inset-px bg-gradient-to-b from-amber-500/20 via-transparent to-transparent rounded-2xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className={`relative bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/40 ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
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
              className="object-cover"
              priority
              quality={90}
              {...(dynamicBg ? { unoptimized: true } : {})}
            />
          )}
        </motion.div>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060606] via-[#060606]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060606]/80 via-transparent to-[#060606]/30" />

        {/* Text over image */}
        <div className="absolute bottom-12 left-10 right-10 z-10">
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
              Curated Adventures
            </motion.p>
            <h2 className="text-4xl font-heading font-bold text-white leading-tight mb-3 whitespace-pre-line">
              {imageHeading}
            </h2>
            <p className="text-white/50 text-sm max-w-xs">
              {imageSubheading}
            </p>
          </motion.div>
        </div>

        {/* Floating accent lines */}
        <motion.div
          className="absolute top-1/4 right-10 w-20 h-px bg-gradient-to-r from-amber-500/50 to-transparent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 1.2 }}
        />
        <motion.div
          className="absolute top-1/3 right-16 w-12 h-px bg-gradient-to-r from-amber-500/30 to-transparent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        />
        <motion.div
          className="absolute bottom-1/3 right-8 w-16 h-px bg-gradient-to-r from-amber-500/40 to-transparent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
        />
      </div>
    </div>
  );
}
