import ScrollReveal from "@/components/ui/ScrollReveal";

/**
 * Shared heading block for every homepage showcase section -- same
 * typographic pattern as the existing "Featured Experiences" heading in
 * src/app/page.tsx, so a new section reads as a continuation of the page
 * rather than a foreign block.
 */
export default function SectionHeading({
  heading,
  subheading,
}: Readonly<{ heading: string; subheading?: string | null }>) {
  return (
    <ScrollReveal variant="blur" stagger>
      <h2 className="text-4xl font-heading font-black text-foreground mb-4 text-center">
        {heading}
      </h2>
      {subheading && (
        <p className="text-foreground/60 max-w-2xl mx-auto text-center mb-12">
          {subheading}
        </p>
      )}
    </ScrollReveal>
  );
}
