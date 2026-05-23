"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Server snapshot is false; client snapshot flips true after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-foreground/5 animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 md:p-2.5 rounded-full bg-foreground/5 text-foreground/70 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center shrink-0"
      aria-label="Toggle Global Theme"
      suppressHydrationWarning
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 md:w-5 md:h-5" />
      ) : (
        <Moon className="w-4 h-4 md:w-5 md:h-5" />
      )}
    </button>
  );
}
