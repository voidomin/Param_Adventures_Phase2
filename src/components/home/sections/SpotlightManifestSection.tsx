import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, IndianRupee } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SaveButton from "@/components/experiences/SaveButton";
import { getMediaUrl } from "@/lib/media/media-gateway";
import { buildTrekAltText } from "@/lib/seo/alt-text";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";

function resolveImage(
  exp: HomepageSectionWithExperiences["experiences"][number],
  mediaSettings: MediaSettings,
) {
  const raw = exp.cardImage || exp.coverImage || exp.images[0] || "https://picsum.photos/seed/placeholder/800/600";
  return getMediaUrl(
    raw,
    mediaSettings.provider || "CLOUDINARY",
    {
      cloudinaryCloudName: mediaSettings.cloudinaryCloudName,
      s3Bucket: mediaSettings.s3Bucket,
      s3Region: mediaSettings.s3Region,
      globalQuality: mediaSettings.globalQuality || 100,
      highFidelity: mediaSettings.highFidelity ?? true,
    },
    { width: 800, crop: "fill" },
  );
}

/**
 * International Expeditions: one large spotlight trip beside a compact
 * "manifest" list of the rest -- for the aspirational, higher-ticket trips.
 */
export default function SpotlightManifestSection({
  section,
  mediaSettings,
}: Readonly<{
  section: HomepageSectionWithExperiences;
  mediaSettings: MediaSettings;
}>) {
  const [hero, ...rest] = section.experiences;
  if (!hero) return null;

  return (
    <div className="pt-12 pb-4 px-4 md:px-12 lg:px-16 relative z-10">
      <SectionHeading heading={section.heading} subheading={section.subheading} />
      <ScrollReveal>
        <div className="grid md:grid-cols-[1.3fr_1fr] gap-5 items-stretch">
          <div className="relative rounded-2xl border border-border overflow-hidden min-h-105 group/hero">
            <Image
              src={resolveImage(hero, mediaSettings)}
              alt={buildTrekAltText(hero.title, hero.location)}
              fill
              sizes="(max-width: 900px) 100vw, 55vw"
              className="object-cover group-hover/hero:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <SaveButton
              experienceId={hero.id}
              size={16}
              variant="card-inline"
              className="absolute top-4 right-4 w-9 h-9 bg-black/40 border border-white/20 hover:bg-black/60 z-10"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <span className="inline-block bg-white/10 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-3">
                {hero.difficulty}
              </span>
              <Link href={`/experiences/${hero.slug}`} className="block">
                <h3 className="text-2xl font-heading font-bold mb-2 leading-tight">{hero.title}</h3>
              </Link>
              <div className="flex items-center gap-3 text-white/75 text-xs font-semibold mb-4">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{hero.location}</span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{hero.durationDays}D / {Math.max(hero.durationDays - 1, 0)}N</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/15">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">From</span>
                  <span className="text-lg font-black flex items-center"><IndianRupee className="w-3.5 h-3.5 mr-0.5" />{Number(hero.basePrice).toLocaleString("en-IN")}</span>
                </div>
                <Link
                  href={`/experiences/${hero.slug}?book=true`}
                  className="px-4.5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:scale-[1.05] transition-transform"
                >
                  Book Now
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {rest.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiences/${exp.slug}`}
                className="flex items-center gap-3.5 bg-card border border-border rounded-2xl p-3 hover:border-primary/50 transition-colors flex-1"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-foreground/5">
                  <Image
                    src={resolveImage(exp, mediaSettings)}
                    alt={buildTrekAltText(exp.title, exp.location)}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">{exp.location}</span>
                  <h4 className="font-heading font-bold text-sm truncate">{exp.title}</h4>
                  <p className="text-xs text-foreground/50 font-medium mt-0.5">
                    {exp.durationDays}D / {Math.max(exp.durationDays - 1, 0)}N · {exp.difficulty}
                  </p>
                </div>
                <span className="font-heading font-black text-sm shrink-0 whitespace-nowrap">
                  ₹{Number(exp.basePrice).toLocaleString("en-IN")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
