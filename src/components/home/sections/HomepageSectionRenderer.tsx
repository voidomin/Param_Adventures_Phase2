import MosaicGridSection from "./MosaicGridSection";
import SpotlightManifestSection from "./SpotlightManifestSection";
import TripListSection from "./TripListSection";
import SpecPanelsSection from "./SpecPanelsSection";
import AltitudeTickerSection from "./AltitudeTickerSection";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";

/**
 * Dispatches a HomepageSection row to whichever of the 5 fixed layout
 * components matches its (immutable) `layout` value.
 */
export default function HomepageSectionRenderer({
  section,
  mediaSettings,
}: Readonly<{
  section: HomepageSectionWithExperiences;
  mediaSettings: MediaSettings;
}>) {
  switch (section.layout) {
    case "MOSAIC_GRID":
      return <MosaicGridSection section={section} mediaSettings={mediaSettings} />;
    case "SPOTLIGHT_MANIFEST":
      return <SpotlightManifestSection section={section} mediaSettings={mediaSettings} />;
    case "PILGRIMAGE_TRAIL":
      return <TripListSection section={section} mediaSettings={mediaSettings} />;
    case "SPEC_PANELS":
      return <SpecPanelsSection section={section} mediaSettings={mediaSettings} />;
    case "ALTITUDE_TICKER":
      return <AltitudeTickerSection section={section} mediaSettings={mediaSettings} />;
    default:
      return null;
  }
}
