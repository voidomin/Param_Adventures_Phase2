"use client";

import { motion } from "framer-motion";

export default function InfiniMarquee({
  destinations = [],
}: {
  readonly destinations?: string[];
}) {
  const repeatedItems = [
    ...destinations,
    ...destinations,
    ...destinations,
    ...destinations,
  ];

  if (destinations.length === 0) return null;

  return (
    <div className="py-2 bg-primary overflow-hidden border-y border-white/10 relative">
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{
            x: [0, -50 + "%"],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex items-center gap-6 px-4"
        >
          {repeatedItems.map((item, idx) => (
            <div key={`${item}-${idx}`} className="flex items-center gap-6">
              <span className="text-primary-foreground text-[10px] md:text-xs font-heading font-bold tracking-[0.2em] uppercase opacity-90">
                {item}
              </span>
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-primary-foreground/40 rounded-full" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
