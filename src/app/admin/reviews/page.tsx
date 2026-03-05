"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  Globe,
  Mountain,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Quote,
} from "lucide-react";

interface AdminReview {
  id: string;
  rating: number;
  reviewText: string;
  isFeaturedHome: boolean;
  isFeaturedExperience: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  experience: { id: string; title: string; slug: string };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function StarRow({ rating }: Readonly<{ rating: number }>) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-primary text-primary" : "text-foreground/15"}`}
        />
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  icon: Icon,
  color,
}: Readonly<{
  checked: boolean;
  onChange: () => void;
  label: string;
  icon: React.ElementType;
  color: "primary" | "purple";
}>) {
  const activeColor = color === "purple" ? "bg-purple-500" : "bg-primary";
  const ringColor =
    color === "purple" ? "focus:ring-purple-500/50" : "focus:ring-primary/50";

  const activeLabelColor =
    color === "purple" ? "text-purple-500" : "text-primary";
  const labelColor = checked ? activeLabelColor : "text-foreground/40";

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${ringColor} ${checked ? activeColor : "bg-foreground/15"}`}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
      <span
        className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${labelColor}`}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const url = new URL(
        "/api/admin/reviews",
        globalThis.location?.origin ?? "",
      );
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load reviews");
      const data = await res.json();
      setReviews(data.reviews);
      setPagination(data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleToggle = async (
    reviewId: string,
    field: "isFeaturedHome" | "isFeaturedExperience",
    currentValue: boolean,
  ) => {
    const key = `${reviewId}-${field}`;
    setUpdating((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                isFeaturedHome: data.review.isFeaturedHome,
                isFeaturedExperience: data.review.isFeaturedExperience,
              }
            : r,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Client-side search filter
  const filtered = search
    ? reviews.filter(
        (r) =>
          r.user.name.toLowerCase().includes(search.toLowerCase()) ||
          r.experience.title.toLowerCase().includes(search.toLowerCase()) ||
          r.reviewText.toLowerCase().includes(search.toLowerCase()),
      )
    : reviews;

  const featuredHomeCount = reviews.filter((r) => r.isFeaturedHome).length;
  const featuredExpCount = reviews.filter((r) => r.isFeaturedExperience).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-black text-foreground flex items-center gap-3">
            <Quote className="w-8 h-8 text-primary" />
            Review Management
          </h1>
          <p className="text-foreground/60 mt-1 text-sm">
            Pin reviews to the homepage or specific experience pages.
          </p>
        </div>

        {/* Stats badges */}
        <div className="flex gap-3 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">
              {featuredHomeCount}
            </span>
            <span className="text-xs text-foreground/60">on homepage</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Mountain className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-bold text-purple-500">
              {featuredExpCount}
            </span>
            <span className="text-xs text-foreground/60">on trips</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
        <input
          type="text"
          placeholder="Search by name, experience, text..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearch(searchInput);
          }}
          onBlur={() => setSearch(searchInput)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-foreground/40">
            <Quote className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No reviews found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/[0.03]">
                  <th className="px-5 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wider">
                    Reviewer
                  </th>
                  <th className="px-5 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-5 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wider w-16">
                    Rating
                  </th>
                  <th className="px-5 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wider max-w-xs">
                    Review
                  </th>
                  <th className="px-5 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wider text-center">
                    Homepage
                  </th>
                  <th className="px-5 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wider text-center">
                    Experience Page
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((review) => {
                  const homeKey = `${review.id}-isFeaturedHome`;
                  const expKey = `${review.id}-isFeaturedExperience`;
                  const isFeatured =
                    review.isFeaturedHome || review.isFeaturedExperience;
                  const rowBg = isFeatured ? "bg-primary/[0.02]" : "";
                  return (
                    <tr
                      key={review.id}
                      className={`hover:bg-foreground/[0.02] transition-colors ${rowBg}`}
                    >
                      {/* Reviewer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {review.user.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground leading-tight">
                              {review.user.name}
                            </p>
                            <p className="text-foreground/40 text-xs mt-0.5">
                              {review.user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="px-5 py-4">
                        <a
                          href={`/experiences/${review.experience.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                        >
                          {review.experience.title}
                        </a>
                        <p className="text-foreground/40 text-xs mt-0.5">
                          {new Date(review.createdAt).toLocaleDateString(
                            "en-IN",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </p>
                      </td>

                      {/* Rating */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <StarRow rating={review.rating} />
                          <span className="text-xs text-foreground/50 font-bold">
                            {review.rating}/5
                          </span>
                        </div>
                      </td>

                      {/* Review text */}
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-foreground/70 text-xs leading-relaxed line-clamp-3">
                          {review.reviewText}
                        </p>
                      </td>

                      {/* Featured Home toggle */}
                      <td className="px-5 py-4 text-center">
                        {updating[homeKey] ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />
                        ) : (
                          <Toggle
                            checked={review.isFeaturedHome}
                            onChange={() =>
                              handleToggle(
                                review.id,
                                "isFeaturedHome",
                                review.isFeaturedHome,
                              )
                            }
                            label="Home"
                            icon={Globe}
                            color="primary"
                          />
                        )}
                      </td>

                      {/* Featured Experience toggle */}
                      <td className="px-5 py-4 text-center">
                        {updating[expKey] ? (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-500 mx-auto" />
                        ) : (
                          <Toggle
                            checked={review.isFeaturedExperience}
                            onChange={() =>
                              handleToggle(
                                review.id,
                                "isFeaturedExperience",
                                review.isFeaturedExperience,
                              )
                            }
                            label="Trip"
                            icon={Mountain}
                            color="purple"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground/50">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {pagination.total}
            </span>{" "}
            reviews
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border text-foreground/60 hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-foreground/70">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page === pagination.totalPages}
              className="p-2 rounded-xl border border-border text-foreground/60 hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
