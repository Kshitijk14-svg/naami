import type { Metadata } from "next";
import { getAllDesignSettings } from "@/db/queries/designSettings";
import {
  ABOUT_PILLARS_DEFAULT,
  ABOUT_TIMELINE_DEFAULT,
  ABOUT_TEAM_DEFAULT,
  parseListSetting,
  type AboutMilestone,
  type AboutPillar,
  type AboutTeamMember,
} from "@/lib/pageContentDefaults";
import AboutClient, { type AboutContent } from "@/components/AboutClient";

export const metadata: Metadata = {
  title: "About — NAAMI Atelier",
  description: "The story, method, and people behind NAAMI — shirts built for the long game.",
};

export const revalidate = 300;

export default async function AboutPage() {
  const s = await getAllDesignSettings();

  const content: AboutContent = {
    heroKicker: s.about_hero_kicker,
    heroTitle: s.about_hero_title,
    heroTitleAccent: s.about_hero_title_accent,
    heroSubline: s.about_hero_subline,
    storyImage: s.about_story_image,
    foundingEyebrow: s.about_founding_eyebrow,
    foundingBody: s.about_founding_body,
    methodKicker: s.about_method_kicker,
    methodTitle: s.about_method_title,
    methodTitleAccent: s.about_method_title_accent,
    pillars: parseListSetting<AboutPillar>(s.about_pillars_json, ABOUT_PILLARS_DEFAULT),
    archiveKicker: s.about_archive_kicker,
    timeline: parseListSetting<AboutMilestone>(s.about_timeline_json, ABOUT_TIMELINE_DEFAULT),
    teamKicker: s.about_team_kicker,
    team: parseListSetting<AboutTeamMember>(s.about_team_json, ABOUT_TEAM_DEFAULT),
    closingQuote: s.about_closing_quote,
    closingAttribution: s.about_closing_attribution,
    closingCtaLabel: s.about_closing_cta_label,
  };

  return <AboutClient content={content} />;
}
