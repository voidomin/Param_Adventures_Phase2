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

  const resolveShareUrl = () => {
    if (globalThis.window === undefined) return url ?? "";
    const base = globalThis.window.location.origin;
    if (!url) return globalThis.window.location.href;
    return url.startsWith("http") ? url : `${base}${url}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = resolveShareUrl();
    const shareData = {
      title,
      text: text || `Check out this experience on Param Adventures: ${title}`,
      url: shareUrl,
    };

    // Try Web Share API first
    if (
      globalThis.navigator?.share !== undefined &&
      !!globalThis.navigator?.canShare?.(shareData)
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }

    // Fallback: Try mailto link for email sharing (good for Outlook/desktop)
    const subject = encodeURIComponent(`Check out this adventure: ${title}`);
    const body = encodeURIComponent(`${text || `Explore ${title} with Param Adventures.`}\n\nLink: ${shareUrl}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    // Create a temporary link and click it to open the email client
    const a = globalThis.document.createElement("a");
    a.href = mailtoUrl;
    a.style.display = "none";
    globalThis.document.body.appendChild(a);
    a.click();
    globalThis.document.body.removeChild(a);

    // Fallback to clipboard copy as well so user has it "just in case"
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
