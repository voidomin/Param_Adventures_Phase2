"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface Review {
  id: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  user: {
    name: string;
  };
}

export default function ExperienceReviews({
  slug,
}: Readonly<{ slug: string }>) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/experiences/${slug}/reviews?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/experiences/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      setSubmitSuccess(true);
      await fetchReviews();
      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
        setReviewText("");
        setRating(5);
      }, 2000);
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to submit review",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Traveler Reviews
          </h2>
          {stats.totalReviews > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= Math.round(stats.averageRating)
                        ? "fill-primary text-primary"
                        : "text-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-lg">
                {stats.averageRating.toFixed(1)}
              </span>
              <span className="text-foreground/60">
                ({stats.totalReviews} reviews)
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all"
        >
          Write a Review
        </button>
      </div>

      {/* Reviews List */}
      <div className="grid gap-6">
        {reviews.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-foreground/60 mb-4">
              No reviews yet for this experience.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card border border-border p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-lg">{review.user.name}</div>
                <div className="text-sm text-foreground/40">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="flex mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= review.rating
                        ? "fill-primary text-primary"
                        : "text-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {review.reviewText}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black font-heading">
                  Rate your experience
                </h3>
                <p className="text-foreground/60 mt-2">
                  Share your thoughts to help other travelers!
                </p>
              </div>

              {submitSuccess ? (
                <div className="flex flex-col items-center py-8 gap-4 text-green-500">
                  <CheckCircle className="w-16 h-16 animate-pulse" />
                  <p className="font-bold text-lg">
                    Review submitted successfully!
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setRating(s)}
                        className="focus:outline-none hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-10 h-10 ${
                            s <= rating
                              ? "fill-primary text-primary"
                              : "text-foreground/20"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Tell us about the guides, the trail, the food..."
                    rows={5}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-medium text-foreground placeholder-foreground/30"
                  />

                  {submitError && (
                    <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" /> {submitError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold border border-border hover:bg-foreground/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || reviewText.length < 10}
                      className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Submit Review"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
