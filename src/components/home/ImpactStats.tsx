"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { Users, Map, Compass, Star } from "lucide-react";

interface StatItemProps {
  readonly label: string;
  readonly value: number;
  readonly suffix?: string;
  readonly icon: React.ReactNode;
}

function Counter({
  value,
  suffix = "",
}: {
  readonly value: number;
  readonly suffix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const spring = useSpring(0, {
    mass: 1,
    stiffness: 100,
    damping: 30,
  });

  const display = useTransform(
    spring,
    (current) => Math.round(current).toLocaleString() + suffix,
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

interface DynamicStats {
  adventurers: number;
  routes: number;
  kmTrekked: number;
  rating: number;
}

export default function ImpactStats({
  dynamicData,
}: {
  readonly dynamicData: DynamicStats;
}) {
  const stats: StatItemProps[] = [
    {
      label: "Happy Adventurers",
      value: dynamicData.adventurers,
      suffix: "+",
      icon: <Users className="w-6 h-6" />,
    },
    {
      label: "Unique Routes",
      value: dynamicData.routes,
      suffix: "+",
      icon: <Map className="w-6 h-6" />,
    },
    {
      label: "KM Trekked",
      value: dynamicData.kmTrekked,
      suffix: "+",
      icon: <Compass className="w-6 h-6" />,
    },
    {
      label: "Average Rating",
      value: dynamicData.rating,
      suffix: "/5",
      icon: <Star className="w-6 h-6" />,
    },
  ];

  return (
    <section className="py-24 bg-card border-y border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="p-3 rounded-2xl bg-primary/10 text-primary mb-4">
                {stat.icon}
              </div>
              <div className="text-3xl md:text-5xl font-heading font-black text-foreground mb-2">
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm md:text-base text-muted-foreground font-medium uppercase tracking-widest">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2" />
    </section>
  );
}
