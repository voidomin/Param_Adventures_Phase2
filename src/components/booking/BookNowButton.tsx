"use client";

import { useState } from "react";
import BookingModal from "@/components/booking/BookingModal";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

interface BookNowButtonProps {
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  basePrice: number;
  maxCapacity: number;
  pickupPoints: string[];
  dropPoints: string[];
}

export default function BookNowButton({
  experienceId,
  experienceTitle,
  experienceSlug,
  basePrice,
  maxCapacity,
  pickupPoints,
  dropPoints,
}: Readonly<BookNowButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  function handleClick() {
    if (!user) {
      router.push(`/login?redirect=/experiences/${experienceSlug}`);
      return;
    }
    setIsOpen(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black text-lg hover:scale-[1.02] transition-transform shadow-xl shadow-primary/25 disabled:opacity-50 disabled:scale-100"
      >
        {isLoading ? "Loading…" : "Book Now"}
      </button>
      <p className="text-center text-xs text-foreground/50 mt-4 font-medium">
        Secure payment powered by Razorpay
      </p>

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
    </>
  );
}
