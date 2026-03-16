"use client";

import { Share2, Check } from "lucide-react";
import { useState, useEffect } from "react";
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

  // Use provided URL or fallback to current window location - handled in useEffect to avoid hydration mismatch
  const [shareUrl, setShareUrl] = useState(url || "");

  useEffect(() => {
    if (globalThis.window !== undefined) {
      // If no url provided, use current. If relative, make absolute.
      const base = globalThis.window.location.origin;
      let finalUrl = globalThis.window.location.href;
      if (url) {
        finalUrl = url.startsWith('http') ? url : `${base}${url}`;
      }
      setShareUrl(finalUrl);
    }
  }, [url]);

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
    outline: "bg-background/10 border border-border/40 text-foreground hover:bg-foreground/10 backdrop-blur-md shadow-xl ring-1 ring-border/10",
    ghost: "bg-transparent hover:bg-foreground/5 text-foreground/70",
  };

  return (
    <button
      onClick={handleShare}
      suppressHydrationWarning
      className={cn(
        "flex items-center justify-center w-10 h-10 aspect-square rounded-full transition-all duration-300 relative group",
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
