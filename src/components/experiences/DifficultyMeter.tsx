import { Info } from "lucide-react";

export type DifficultyLevel = "EASY" | "MODERATE" | "DIFFICULT" | "EXTREME";

interface DifficultyMeterProps {
  difficulty: DifficultyLevel;
}

const DIFFICULTY_CONFIG = {
  EASY: {
    label: "Easy",
    color: "bg-green-500",
    bars: 1,
    description: "Suitable for beginners. Minimal exertion.",
  },
  MODERATE: {
    label: "Moderate",
    color: "bg-yellow-500",
    bars: 2,
    description: "Requires basic fitness. Mild elevation gain.",
  },
  DIFFICULT: {
    label: "Difficult",
    color: "bg-orange-500",
    bars: 3,
    description: "Requires good fitness. Steep climbs and long days.",
  },
  EXTREME: {
    label: "Extreme",
    color: "bg-red-500",
    bars: 4,
    description: "For experienced trekkers only. Harsh conditions.",
  },
};

export default function DifficultyMeter({ difficulty }: Readonly<DifficultyMeterProps>) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.MODERATE;

  return (
    <div className="relative group inline-flex items-center">
      <div className="bg-foreground/[0.03] backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-sm flex items-center gap-2 cursor-help hover:bg-foreground/[0.05] transition-colors">
        <span>Difficulty: {config.label}</span>
        <div className="flex gap-0.5 items-end h-3.5">
          {[1, 2, 3, 4].map((bar) => {
            const heightClass = ["h-1.5", "h-2", "h-2.5", "h-3.5"][bar - 1];

            return (
              <div
                key={bar}
                className={`w-1.5 rounded-sm transition-colors ${heightClass} ${
                  bar <= config.bars ? config.color : "bg-foreground/10"
                }`}
              />
            );
          })}
        </div>
        <Info className="w-3.5 h-3.5 text-foreground/40 ml-1 group-hover:text-primary transition-colors" />
      </div>

      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-max max-w-[280px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] pointer-events-none">
        <div className="bg-card text-card-foreground text-[12px] p-4 rounded-2xl shadow-2xl border border-border/50 text-center relative whitespace-normal">
          <p className="font-bold mb-1.5 text-primary text-sm">{config.label} Level</p>
          <p className="text-foreground/80 leading-relaxed font-medium">{config.description}</p>
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-t border-l border-border/50 rotate-45" />
        </div>
      </div>
    </div>
  );
}
