"use client";

import { useState } from "react";
import { IndianRupee } from "lucide-react";
import BookingModal from "@/components/booking/BookingModal";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

interface MobileBookingBarProps {
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  basePrice: number;
  maxCapacity: number;
  pickupPoints: string[];
  dropPoints: string[];
}

export default function MobileBookingBar({
  experienceId,
  experienceTitle,
  experienceSlug,
  basePrice,
  maxCapacity,
  pickupPoints,
  dropPoints,
}: Readonly<MobileBookingBarProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  function handleBookClick() {
    if (!user) {
      router.push(`/login?redirect=/experiences/${experienceSlug}`);
      return;
    }
    setIsOpen(true);
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-foreground/50 font-medium uppercase tracking-wider">
            Starting from
          </span>
          <div className="flex items-center gap-1">
            <IndianRupee className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-foreground">
              {Number(basePrice).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <button
          onClick={handleBookClick}
          disabled={isLoading}
          className="flex-1 max-w-[200px] h-12 rounded-xl bg-primary text-primary-foreground font-black text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          {isLoading ? "Loading…" : "Book Now"}
        </button>
      </div>

      {isOpen && (
        <BookingModal
          experienceId={experienceId}
          experienceTitle={experienceTitle}
          experienceSlug={experienceSlug}
          basePrice={basePrice}
          maxCapacity={maxCapacity}
          pickupPoints={pickupPoints}
          dropPoints={dropPoints}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
