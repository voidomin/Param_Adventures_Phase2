import { prisma } from "@/lib/db";
import Link from "next/link";
import { Star, Quote, ArrowRight } from "lucide-react";
import Carousel from "@/components/ui/Carousel";
async function getFeaturedHomeReviews() {
  return prisma.experienceReview.findMany({
    where: { isFeaturedHome: true },
    include: {
      user: { select: { name: true } },
      experience: { select: { title: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
}

export default async function Testimonials() {
  const reviews = await getFeaturedHomeReviews();

  if (reviews.length === 0) return null;

  return (
    <section className="py-24 px-4 md:px-12 lg:px-16 bg-background">
      <div className="w-full">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            <Star className="w-3 h-3 fill-primary" />
            Real Stories
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-black text-foreground leading-tight">
            What Our Travelers Say
          </h2>
          <p className="text-foreground/50 mt-3 max-w-xl mx-auto">
            Honest words from adventurers who&apos;ve been there, done that —
            and can&apos;t wait to go back.
          </p>
        </div>

        {/* Grid */}
        {/* Grid */}
        <Carousel>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="w-[85vw] sm:w-[320px] lg:w-[380px] shrink-0 snap-start bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-64"
            >
              <div>
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${s <= review.rating ? "fill-primary text-primary" : "text-foreground/15"}`}
                    />
                  ))}
                </div>

                {/* Large decorative quote */}
                <Quote className="w-7 h-7 text-primary/20 mb-2" />

                {/* Review text */}
                <p className="text-foreground/80 leading-relaxed text-sm font-medium">
                  {review.reviewText}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs shrink-0">
                    {review.user.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span className="font-bold text-foreground text-sm">
                    {review.user.name}
                  </span>
                </div>
                <Link
                  href={`/experiences/${review.experience.slug}`}
                  className="flex items-center gap-1 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:gap-1.5"
                >
                  {review.experience.title.split(" ").slice(0, 3).join(" ")}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
