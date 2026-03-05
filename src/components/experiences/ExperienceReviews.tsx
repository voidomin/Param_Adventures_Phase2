"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Star,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Lock,
  LogIn,
  Pencil,
  Quote,
} from "lucide-react";

interface Review {
  id: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  user: { name: string };
}

interface FeaturedReview {
  id: string;
  rating: number;
  reviewText: string;
  user: { name: string };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<number, number>;
}

interface MyReviewState {
  status: "loading" | "guest" | "ineligible" | "eligible" | "reviewed";
  existingReview: {
    id: string;
    rating: number;
    reviewText: string;
  } | null;
}

/** Resolves the my-review API response into a MyReviewState value. */
function resolveMyReviewState(data: {
  canReview: boolean;
  review: { id: string; rating: number; reviewText: string } | null;
}): MyReviewState {
  if (!data.canReview) return { status: "ineligible", existingReview: null };
  if (data.review) return { status: "reviewed", existingReview: data.review };
  return { status: "eligible", existingReview: null };
}

/** Star rating row (display-only). */
function StarRow({
  rating,
  size = "sm",
}: Readonly<{ rating: number; size?: "sm" | "md" }>) {
  const cls = size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= rating ? "fill-primary text-primary" : "text-foreground/15"}`}
        />
      ))}
    </div>
  );
}

export default function ExperienceReviews({
  slug,
}: Readonly<{ slug: string }>) {
  const router = useRouter();
  const pathname = usePathname();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [featuredReview, setFeaturedReview] = useState<FeaturedReview | null>(
    null,
  );
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    breakdown: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [myReview, setMyReview] = useState<MyReviewState>({
    status: "loading",
    existingReview: null,
  });

  // Modal & form state
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
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
        setFeaturedReview(data.featuredReview ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  const fetchMyReview = useCallback(async () => {
    try {
      const res = await fetch(`/api/experiences/${slug}/reviews/my-review`);
      if (res.status === 401) {
        setMyReview({ status: "guest", existingReview: null });
        return;
      }
      if (!res.ok) {
        setMyReview({ status: "eligible", existingReview: null });
        return;
      }
      const data = await res.json();
      setMyReview(resolveMyReviewState(data));
    } catch {
      setMyReview({ status: "eligible", existingReview: null });
    }
  }, [slug]);

  useEffect(() => {
    fetchReviews();
    fetchMyReview();
  }, [fetchReviews, fetchMyReview]);

  const openModal = () => {
    if (myReview.existingReview) {
      setRating(myReview.existingReview.rating);
      setReviewText(myReview.existingReview.reviewText);
    } else {
      setRating(5);
      setReviewText("");
    }
    setSubmitError("");
    setSubmitSuccess(false);
    setShowModal(true);
  };

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
      await fetchMyReview();
      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to submit review",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Action Button ────────────────────────────────────────────────────────────

  const renderActionButton = () => {
    if (myReview.status === "loading") {
      return (
        <div className="w-36 h-10 rounded-xl bg-foreground/10 animate-pulse" />
      );
    }

    if (myReview.status === "guest") {
      return (
        <button
          onClick={() => {
            const redirect = pathname ?? "/experiences/" + slug;
            router.push("/login?redirect=" + encodeURIComponent(redirect));
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary/50 text-primary/80 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm"
        >
          <LogIn className="w-4 h-4" />
          Log in to Review
        </button>
      );
    }

    if (myReview.status === "ineligible") {
      return (
        <div
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground/40 font-semibold text-sm cursor-not-allowed select-none"
          title="Reviews are unlocked after you complete this trip"
        >
          <Lock className="w-4 h-4" />
          Review after your trip
        </div>
      );
    }

    if (myReview.status === "reviewed") {
      return (
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all text-sm group"
        >
          <Pencil className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Edit Your Review
        </button>
      );
    }

    return (
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all text-sm group"
      >
        <Pencil className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        Write a Review
      </button>
    );
  };

  // ─── Rating Breakdown ─────────────────────────────────────────────────────────

  const renderBreakdown = () => {
    const total = stats.totalReviews;
    if (total === 0) return null;
    return (
      <div className="space-y-2 min-w-[160px]">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.breakdown[star] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right text-foreground/60 font-medium">
                {star}
              </span>
              <Star className="w-3 h-3 text-primary fill-primary shrink-0" />
              <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-foreground/50">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Submit button label ──────────────────────────────────────────────────────

  const getSubmitLabel = () => {
    if (isSubmitting) return <Loader2 className="w-4 h-4 animate-spin" />;
    return myReview.status === "reviewed" ? "Update Review" : "Submit Review";
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
      {/* ── Header & Stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-3xl font-heading font-bold flex items-center gap-3 mb-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Traveler Reviews
          </h2>

          {stats.totalReviews > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Average score */}
              <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-5 py-4">
                <div className="text-4xl font-black text-foreground leading-none">
                  {stats.averageRating.toFixed(1)}
                </div>
                <div>
                  <StarRow rating={Math.round(stats.averageRating)} size="md" />
                  <p className="text-xs text-foreground/50 mt-1">
                    {stats.totalReviews} reviews
                  </p>
                </div>
              </div>
              {renderBreakdown()}
            </div>
          ) : (
            <p className="text-foreground/50 text-sm">
              No reviews yet — be the first to share your experience!
            </p>
          )}
        </div>
        <div className="shrink-0">{renderActionButton()}</div>
      </div>

      {/* ── Featured Pull-quote ── */}
      {featuredReview && (
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 sm:p-8 overflow-hidden">
          <Quote className="absolute -top-2 -left-2 w-20 h-20 text-primary/5 rotate-180" />

          <StarRow rating={featuredReview.rating} size="md" />

          <blockquote className="text-lg sm:text-xl font-semibold text-foreground leading-relaxed italic my-4">
            &ldquo;{featuredReview.reviewText}&rdquo;
          </blockquote>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0">
              {featuredReview.user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                {featuredReview.user.name}
              </p>
              <p className="text-xs text-foreground/50">Verified Traveler</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Reviews List ── */}
      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-2xl p-10 text-center">
            <Quote className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
            <p className="text-foreground/50 font-medium">
              No reviews yet for this experience.
            </p>
            <p className="text-foreground/30 text-sm mt-1">
              Complete a trip to be the first reviewer!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="group bg-card border border-border p-6 rounded-2xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {review.user.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="font-bold text-foreground leading-tight">
                      {review.user.name}
                    </div>
                    <div className="text-xs text-foreground/40 mt-0.5">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <StarRow rating={review.rating} />
              </div>
              <p className="text-foreground/75 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {review.reviewText}
              </p>
            </div>
          ))
        )}
      </div>

      {/* ── Write / Edit Review Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowModal(false);
          }}
          tabIndex={-1}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Write a review"
            className="bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-xl font-black font-heading text-center">
                {myReview.status === "reviewed"
                  ? "Update Your Review"
                  : "Rate Your Experience"}
              </h3>
              <p className="text-foreground/50 text-sm text-center mt-1">
                {myReview.status === "reviewed"
                  ? "Edit your rating or review text below"
                  : "Share your thoughts to help other travelers!"}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {submitSuccess ? (
                <div className="flex flex-col items-center py-8 gap-3 text-green-500">
                  <CheckCircle className="w-16 h-16" />
                  <p className="font-bold text-lg">
                    {myReview.status === "reviewed"
                      ? "Review updated!"
                      : "Review submitted!"}
                  </p>
                  <p className="text-foreground/50 text-sm text-center">
                    Thank you for sharing your experience.
                  </p>
                </div>
              ) : (
                <>
                  {/* Star Picker */}
                  <div>
                    <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest mb-3 text-center">
                      Your Rating
                    </p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => {
                        const isActive = s <= (hoverRating || rating);
                        const starCls = isActive
                          ? "fill-primary text-primary"
                          : "text-foreground/20";
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRating(s)}
                            onMouseEnter={() => setHoverRating(s)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="focus:outline-none transition-transform hover:scale-125 active:scale-110"
                            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                          >
                            <Star
                              className={`w-10 h-10 transition-colors ${starCls}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-center text-xs text-foreground/40 mt-2">
                      {
                        ["", "Poor", "Fair", "Good", "Great", "Excellent!"][
                          hoverRating || rating
                        ]
                      }
                    </p>
                  </div>

                  {/* Text area */}
                  <div>
                    <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest mb-2">
                      Your Review
                    </p>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us about the guides, the trail, the food, the moments..."
                      rows={5}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none text-sm text-foreground placeholder-foreground/30 transition-all"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span
                        className={`text-xs ${reviewText.length < 10 ? "text-foreground/30" : "text-green-500"}`}
                      >
                        {reviewText.length < 10
                          ? `${10 - reviewText.length} more characters needed`
                          : "✓ Minimum length met"}
                      </span>
                      <span className="text-xs text-foreground/30">
                        {reviewText.length} chars
                      </span>
                    </div>
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold border border-border text-foreground/70 hover:bg-foreground/5 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || reviewText.length < 10}
                      className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/20 text-sm"
                    >
                      {getSubmitLabel()}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
