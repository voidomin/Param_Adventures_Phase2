"use client";

import { useState, useEffect } from "react";

interface Section {
  id: string;
  label: string;
}

export default function ExperienceStickyNav({ sections }: Readonly<{ sections: Section[] }>) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const handleScroll = () => {
      let current = sections[0]?.id;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Adjust offset (150px allows enough spacing before intersection)
          if (rect.top <= 150) {
            current = section.id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on load
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // scroll position negative offset for navbar (64px) + sticky nav (~60px) + breathing room
      const y = element.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (!sections.length) return null;

  return (
    <div className="sticky top-16 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50 py-3 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
    <nav className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar snap-x">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all snap-start ${
            activeSection === section.id
              ? "bg-primary text-primary-foreground shadow-md scale-105"
              : "bg-background text-foreground/60 border border-border/50 hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>
    </div>
  );
}
