"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ScrollRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly direction?: "up" | "down" | "left" | "right" | "none";
  readonly variant?: "fade" | "blur" | "zoom";
  readonly stagger?: boolean;
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  variant = "fade",
  stagger = false,
}: Readonly<ScrollRevealProps>) {
  const getInitial = () => {
    const initial: {
      opacity: number;
      y?: number;
      x?: number;
      filter?: string;
      scale?: number;
    } = { opacity: 0 };

    switch (direction) {
      case "up":
        initial.y = 40;
        break;
      case "down":
        initial.y = -40;
        break;
      case "left":
        initial.x = 40;
        break;
      case "right":
        initial.x = -40;
        break;
    }

    if (variant === "blur") initial.filter = "blur(12px)";
    if (variant === "zoom") initial.scale = 0.95;

    return initial;
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        filter: "blur(0px)",
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1], // Exponential-style ease for premium feel
        staggerChildren: stagger ? 0.1 : 0,
        delayChildren: delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
