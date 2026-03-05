import Link from "next/link";
import { Clock, MapPin, Users, IndianRupee } from "lucide-react";
import SaveButton from "./SaveButton";

interface Category {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ExperienceCardProps {
  experience: {
    id: string;
    title: string;
    slug: string;
    description: string;
    durationDays: number;
    location: string;
    basePrice: number;
    capacity: number;
    difficulty: "EASY" | "MODERATE" | "HARD" | "EXTREME";
    coverImage?: string;
    cardImage?: string;
    images: string[];
    categories: Category[];
  };
}

export default function ExperienceCard({
  experience,
}: Readonly<ExperienceCardProps>) {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "EASY":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "MODERATE":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "HARD":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "EXTREME":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-border text-foreground";
    }
  };

  const primaryImage =
    experience.cardImage ||
    experience.coverImage ||
    experience.images[0] ||
    "https://picsum.photos/seed/placeholder/800/600";
  const isVideo = /\.(mp4|webm)$/i.test(primaryImage);

  return (
    <Link
      href={`/experiences/${experience.slug}`}
      className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 relative duration-300"
    >
      <div className="relative h-64 w-full overflow-hidden bg-foreground/5">
        {isVideo ? (
          <video
            src={primaryImage}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={experience.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}

        <div className="absolute inset-x-0 top-0 p-4 flex justify-between items-start z-10">
          <div className="flex flex-col gap-2 relative z-20">
            {experience.categories.slice(0, 2).map((cat) => (
              <span
                key={cat.category.id}
                className="bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-foreground border border-border shadow-sm"
              >
                {cat.category.name}
              </span>
            ))}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${getDifficultyColor(experience.difficulty)}`}
          >
            {experience.difficulty}
          </span>
        </div>

        {/* Gradient Overlay for bottom text protection */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0 opacity-80" />

        <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-end">
          <div className="flex gap-3 text-white font-medium text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
              <Clock className="w-4 h-4 text-primary" />
              {experience.durationDays}D /{" "}
              {experience.durationDays > 1 ? experience.durationDays - 1 : 0}N
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="truncate max-w-[100px]">
                {experience.location}
              </span>
            </div>
          </div>
        </div>

        <SaveButton
          experienceId={experience.id}
          className="top-16 right-4 z-20"
        />
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold font-heading text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {experience.title}
        </h3>
        <p className="text-foreground/70 text-sm line-clamp-2 mb-6 flex-1">
          {experience.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
          <div className="flex items-center gap-2 text-foreground/60 text-sm">
            <Users className="w-4 h-4" />
            <span>Up to {experience.capacity} pax</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-foreground/50 font-medium">
              Starting from
            </span>
            <span className="text-lg font-bold text-foreground flex items-center">
              <IndianRupee className="w-4 h-4 mr-0.5" />
              {Number(experience.basePrice).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
