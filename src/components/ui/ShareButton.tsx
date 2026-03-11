"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: "outline" | "ghost" | "solid";
}

export default function ShareButton({
  title,
  text,
  url,
  className,
  variant = "ghost",
}: Readonly<ShareButtonProps>) {
  const [copied, setCopied] = useState(false);

  // Use provided URL or fallback to current window location
  const shareUrl = url || (globalThis.window === undefined ? "" : globalThis.window.location.href);
  const shareData = {
    title: title,
    text: text || `Check out this experience on Param Adventures: ${title}`,
    url: shareUrl,
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Try Web Share API first
    if (globalThis.navigator?.share !== undefined && !!globalThis.navigator?.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }

    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Unable to copy to clipboard:", err);
    }
  };

  const variants = {
    solid: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "bg-background/50 border border-white/20 text-white hover:bg-white/10 backdrop-blur-md",
    ghost: "bg-transparent hover:bg-foreground/5 text-foreground/70",
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex items-center justify-center p-2 rounded-full transition-all duration-300 relative group",
        variants[variant],
        className
      )}
      title="Share"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500 animate-in zoom-in" />
      ) : (
        <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
      )}
      
      {/* Tooltip for desktop if copied */}
      {copied && (
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
          Link Copied!
        </span>
      )}
    </button>
  );
}
