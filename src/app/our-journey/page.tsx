import type { Metadata } from "next";
import { Fragment } from "react";
import { getAllDesignSettings } from "@/db/queries/designSettings";
import { OUR_JOURNEY_DEFAULT, parseListSetting, type JourneyStop } from "@/lib/pageContentDefaults";
import EvanliteFooter from "@/components/EvanliteFooter";
import OurJourneyMap from "@/components/OurJourneyMap";
import SectionTitle from "@/components/SectionTitle";

/** Render a setting string with "\n" turned into <br/> line breaks. */
function withLineBreaks(text: string) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

export const metadata: Metadata = {
  title: "Our Journey — NAAMI Atelier",
  description: "The path of the NAAMI atelier, told in images.",
  openGraph: {
    title: "Our Journey — NAAMI Atelier",
    description: "The path of the NAAMI atelier, told in images.",
    siteName: "NAAMI Atelier",
  },
};

export const revalidate = 300;

export default async function OurJourneyPage() {
  const settings = await getAllDesignSettings();
  const stops = parseListSetting<JourneyStop>(settings.our_journey_json, OUR_JOURNEY_DEFAULT).filter(
    (s) => s.image,
  );

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      {/* Header */}
      <section className="px-6 md:px-12 py-16">
        <SectionTitle
          as="h1"
          kicker={settings.our_journey_kicker}
          title={withLineBreaks(settings.our_journey_title ?? "Our")}
          accent={settings.our_journey_title_accent || undefined}
          size="clamp(2.5rem, 5vw, 4.5rem)"
        />

        {/* Selvedge rule */}
        <div
          className="mt-8"
          style={{ height: "1px", background: "linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.1) 2px, transparent)" }}
        />
      </section>

      <section className="flex-1 px-6 md:px-12 pb-20">
        {stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-[3px] h-12 bg-[#5B1C1C] opacity-50 mx-auto mb-8" />
            <p className="font-serif font-light" style={{ fontSize: "1.3rem", color: "rgba(17,17,17,0.4)" }}>
              {settings.our_journey_empty_state}
            </p>
          </div>
        ) : (
          <OurJourneyMap stops={stops} />
        )}
      </section>

      <EvanliteFooter />
    </main>
  );
}
