"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, ArrowRight, X, Sparkles } from "lucide-react";

interface EligibleReviewBooking {
  id: string;
  experience: {
    title: string;
    slug: string;
  };
  slot?: {
    date: string;
  } | null;
}

interface CustomerReviewBannerProps {
  eligibleBookings: EligibleReviewBooking[];
}

export function CustomerReviewBanner({ eligibleBookings }: Readonly<CustomerReviewBannerProps>) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !eligibleBookings || eligibleBookings.length === 0) {
    return null;
  }

  const targetBooking = eligibleBookings[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/20 p-5 shadow-lg mb-6 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                Trek Completed
              </span>
              <div className="flex text-amber-400">
                {[...new Array(5)].map((_, i) => (
                  <Star key={`star-${i + 1}`} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1">
              How was your trip to {targetBooking.experience.title}?
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              Share your adventure feedback and help future trekkers plan their journey!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link
            href={`/experiences/${targetBooking.experience.slug}#reviews`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 text-white font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
          >
            <span>Write a Review</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
