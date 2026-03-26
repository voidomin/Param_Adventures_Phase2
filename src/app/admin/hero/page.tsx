"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import HeroForm from "@/components/admin/HeroForm";
import AuthBackgroundManager from "@/components/admin/AuthBackgroundManager";
import AuthContentManager from "@/components/admin/AuthContentManager";
import QuoteManager from "@/components/admin/QuoteManager";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  videoUrl: string;
  ctaLink: string | null;
  order: number;
  isActive: boolean;
}

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);

  const fetchSlides = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/hero");
      if (res.ok) {
        const data = await res.json();
        setSlides(data.slides);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!globalThis.confirm(`Delete slider "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/hero/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSlides();
      } else {
        alert("Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async (
    id: string,
    direction: "up" | "down",
    index: number,
  ) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === slides.length - 1) return;

    const newSlides = [...slides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap order values
    const tempOrder = newSlides[index].order;
    newSlides[index].order = newSlides[targetIndex].order;
    newSlides[targetIndex].order = tempOrder;

    // Optimistic UI update
    const sorted = [...newSlides].sort((a, b) => a.order - b.order);
    setSlides(sorted);

    // Persist to DB
    try {
      await Promise.all([
        fetch(`/api/admin/hero/${newSlides[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newSlides[index].order }),
        }),
        fetch(`/api/admin/hero/${newSlides[targetIndex].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newSlides[targetIndex].order }),
        }),
      ]);
    } catch (err) {
      console.error("Failed to reorder", err);
      fetchSlides(); // Revert on failure
    }
  };

  const openForm = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlide(slide);
    } else {
      setEditingSlide(null);
    }
    setIsFormOpen(true);
  };

  const onFormClose = () => {
    setIsFormOpen(false);
    setEditingSlide(null);
  };

  const onFormSuccess = () => {
    onFormClose();
    fetchSlides();
  };

  // Content rendering logic refactored to avoid nested ternaries
  let content;
  if (isLoading) {
    content = (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  } else if (slides.length === 0) {
    content = (
      <div className="bg-card border border-border rounded-2xl p-12 text-center text-foreground/60">
        <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-foreground mb-2">
          No Slides Yet
        </h3>
        <p className="mb-6">
          Upload an image or video to create your first homepage banner.
        </p>
        <button
          onClick={() => openForm()}
          className="inline-block bg-background border border-border text-foreground px-6 py-2.5 rounded-full font-bold hover:bg-foreground/5 transition-colors"
        >
          Create Slide
        </button>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-4">
        {slides.map((slide, index) => {
          const isVideo =
            /\.(mp4|webm|ogv)$/i.test(slide.videoUrl) ||
            slide.videoUrl.includes("/video/upload/");

          return (
            <div
              key={slide.id}
              className={`bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-6 items-center transition-colors hover:border-foreground/30 ${
                !slide.isActive && "opacity-60"
              }`}
            >
              <div className="w-full md:w-48 h-24 rounded-lg bg-foreground/5 overflow-hidden relative shrink-0">
                {isVideo ? (
                  <video
                    src={slide.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={slide.videoUrl}
                      alt={slide.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {!slide.isActive && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <span className="bg-background text-foreground text-xs font-bold px-2 py-1 rounded">
                      INACTIVE
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 w-full text-center md:text-left">
                <h3 className="text-xl font-bold text-foreground truncate">
                  {slide.title}
                </h3>
                {slide.subtitle && (
                  <p className="text-foreground/60 truncate mt-1">
                    {slide.subtitle}
                  </p>
                )}
                {slide.ctaLink && (
                  <p className="text-primary text-sm mt-1 truncate">
                    CTA: {slide.ctaLink}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 md:pt-0 border-t border-border md:border-none w-full md:w-auto justify-center md:justify-end">
                <div className="flex flex-col mr-2">
                  <button
                    onClick={() => handleMove(slide.id, "up", index)}
                    disabled={index === 0}
                    className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(slide.id, "down", index)}
                    disabled={index === slides.length - 1}
                    className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => openForm(slide)}
                  className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(slide.id, slide.title)}
                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Hero Slider
          </h1>
          <p className="text-foreground/60 mt-1">
            Manage the background slides on your public homepage.
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/25"
        >
          <Plus className="w-5 h-5" />
          Add Slide
        </button>
      </div>

      {content}

      {isFormOpen && (
        <HeroForm
          slide={editingSlide}
          onClose={onFormClose}
          onSuccess={onFormSuccess}
        />
      )}

      {/* Auth Background Management */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Auth Page Backgrounds
          </h2>
          <p className="text-foreground/60 mt-1">
            Upload custom images or videos for the Sign In &amp; Sign Up pages.
          </p>
        </div>
        <AuthBackgroundManager />
      </div>

      {/* Auth Text Management */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Auth Page Text Content
          </h2>
          <p className="text-foreground/60 mt-1">
            Customize the headings, subheadings, and taglines for your Sign In & Sign Up pages.
          </p>
        </div>
        <AuthContentManager />
      </div>

      {/* Quotes Management */}
      <div className="mt-12 pt-8 border-t border-border">
        <QuoteManager />
      </div>
    </div>
  );
}
