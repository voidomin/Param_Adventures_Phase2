"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousel({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5); // 5px buffer
      setIsAtStart(scrollLeft < 50);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    checkScroll();
    
    // Run checkScroll after a brief delay to ensure DOM is fully laid out and painted
    const timer = setTimeout(checkScroll, 300);

    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
    };
  }, [children]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      // Scroll by 80% of the container width to ensure partial visibility of next item
      const scrollAmount =
        direction === "left" ? -(clientWidth * 0.8) : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative group">
      {/* Left Arrow */}
      <button
        type="button"
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
        aria-label="Scroll Left"
        className={`absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-background/90 backdrop-blur border border-border/50 text-foreground transition-all duration-300 shadow-xl ${
          canScrollLeft
            ? "opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-stretch overflow-x-auto gap-6 sm:gap-8 pb-8 pt-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          @keyframes bounce-horizontal {
            0%, 100% {
              transform: translateY(-50%) translateX(0);
            }
            50% {
              transform: translateY(-50%) translateX(6px);
            }
          }
          .animate-bounce-horizontal {
            animation: bounce-horizontal 1.2s infinite ease-in-out;
          }
        `,
          }}
        />
        {children}
      </div>

      {/* Mobile Swipe Hint */}
      {isMounted && isAtStart && canScrollRight && (
        <button
          type="button"
          onClick={() => {
            scroll("right");
          }}
          aria-label="Swipe right hint"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-xl border border-primary/20 animate-bounce-horizontal cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Right Arrow */}
      <button
        type="button"
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
        aria-label="Scroll Right"
        className={`absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 rounded-full bg-background/90 backdrop-blur border border-border/50 text-foreground transition-all duration-300 shadow-xl ${
          canScrollRight
            ? "opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );
}
