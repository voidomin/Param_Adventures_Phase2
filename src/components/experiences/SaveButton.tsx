"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  experienceId: string;
  size?: number;
  className?: string;
  initialSaved?: boolean; // Optional initial state if we already know it
  variant?: "image-overlay" | "card-inline";
}

export default function SaveButton({
  experienceId,
  size = 20,
  className = "",
  initialSaved = false,
  variant = "image-overlay",
}: Readonly<SaveButtonProps>) {
  const { user } = useAuth();
  const router = useRouter();

  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);

  // If user is logged in, check if this experience is saved
  useEffect(() => {
    if (!user) {
      setIsSaved(false);
      return;
    }

    async function checkSaved() {
      try {
        const res = await fetch("/api/wishlist");
        if (res.ok) {
          const data = await res.json();
          // Adjust based on the actual API format. If it returns `{ saved: [{experience: {id}}, ...] }`
          const savedList = data.saved || [];
          const found = savedList.some(
            (item: { experience: { id: string } }) => item.experience.id === experienceId,
          );
          setIsSaved(found);
        }
      } catch (err) {
        console.error("Failed to check saved status:", err);
      }
    }

    // Only fetch if initialSaved was not provided. In real world, we might want a context or global state
    // but fetching per-component is okay for now if we don't have too many per page.
    checkSaved();
  }, [user, experienceId]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Could show a toast message here
      alert("Please log in to save experiences to your wishlist.");
      router.push(
        "/login?redirect=" + encodeURIComponent(globalThis.location.pathname),
      );
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isSaved) {
        // Remove from wishlist
        const res = await fetch(`/api/wishlist/${experienceId}`, {
          method: "DELETE",
        });
        if (res.ok) setIsSaved(false);
      } else {
        // Add to wishlist
        const res = await fetch(`/api/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experienceId }),
        });
        if (res.ok) setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle = variant === "card-inline"
    ? "bg-background/50 border border-border hover:bg-foreground/5 shadow-md"
    : "bg-background/10 border border-border/40 hover:bg-foreground/10 shadow-xl ring-1 ring-border/10 text-white";

  let heartStyle = "";
  if (isSaved) {
    heartStyle = "fill-red-500 text-red-500";
  } else if (variant === "card-inline") {
    heartStyle = "fill-transparent text-foreground/60 group-hover:text-red-500";
  } else {
    heartStyle = "fill-transparent text-white group-hover:text-red-400";
  }

  return (
    <button
      type="button"
      onClick={toggleSave}
      disabled={isLoading}
      suppressHydrationWarning
      aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        "flex items-center justify-center w-10 h-10 aspect-square rounded-full backdrop-blur-md transition-all active:scale-95 group",
        buttonStyle,
        className
      )}
    >
      <Heart
        size={size}
        className={cn("transition-colors duration-300", heartStyle, isLoading && "animate-pulse")}
      />
    </button>
  );
}
