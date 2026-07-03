import { getHomeContent } from "@/db/queries/home";
import { getAllDesignSettings } from "@/db/queries/designSettings";
import { getHomepageExtras } from "@/db/queries/homepageContent";
import HomeClient from "@/components/HomeClient";

const DEFAULT_HERO_SLIDES = [
  {
    image: "/images/hero-1.png",
    title: "OXFORD STRIPE SHIRT",
    subtitle: "120s Egyptian Cotton Oxford",
    tag: "Naami // AW26 Collection — 001",
  },
  {
    image: "/images/hero-2.png",
    title: "LINEN NATURAL CAMP",
    subtitle: "8oz European Linen",
    tag: "Naami // AW26 Collection — 002",
  },
  {
    image: "/images/hero-3.png",
    title: "SASHIKO BORO OVERSHIRT",
    subtitle: "Hand-stitched Sashiko Weave",
    tag: "Naami // AW26 Collection — 003",
  },
];

export default async function Home() {
  const [content, designSettings, extras] = await Promise.all([
    getHomeContent(),
    getAllDesignSettings(),
    getHomepageExtras(),
  ]);

  const heroSlides = [1, 2, 3].map((n, i) => ({
    image: designSettings[`hero_image_${n}`] || DEFAULT_HERO_SLIDES[i].image,
    title: designSettings[`hero_title_${n}`] || DEFAULT_HERO_SLIDES[i].title,
    subtitle: designSettings[`hero_subtitle_${n}`] || DEFAULT_HERO_SLIDES[i].subtitle,
    tag: designSettings[`hero_tag_${n}`] || DEFAULT_HERO_SLIDES[i].tag,
  }));

  const loomContent = {
    panel1: {
      image: designSettings.loom_panel1_image,
      kicker: designSettings.loom_panel1_kicker,
      title: designSettings.loom_panel1_title,
      body: designSettings.loom_panel1_body,
      label: designSettings.loom_panel1_label,
    },
    panel2: {
      image: designSettings.loom_panel2_image,
      kicker: designSettings.loom_panel2_kicker,
      title: designSettings.loom_panel2_title,
      body: designSettings.loom_panel2_body,
      label: designSettings.loom_panel2_label,
    },
    panel3: {
      kicker: designSettings.loom_panel3_kicker,
      title: designSettings.loom_panel3_title,
      body: designSettings.loom_panel3_body,
    },
  };

  const coinPocketContent = {
    kicker: designSettings.coinpocket_kicker,
    title: designSettings.coinpocket_title,
    titleAccent: designSettings.coinpocket_title_accent,
    description: designSettings.coinpocket_description,
    specs: [1, 2, 3, 4, 5].map((n) => ({
      label: designSettings[`coinpocket_spec${n}_label`],
      value: designSettings[`coinpocket_spec${n}_value`],
    })),
    serialCode: designSettings.coinpocket_serial_code,
    seasonTag: designSettings.coinpocket_season_tag,
  };

  const manifesto = {
    image: designSettings.manifesto_image,
    kicker: designSettings.manifesto_kicker,
    quote: designSettings.manifesto_quote,
    attribution: designSettings.manifesto_attribution,
  };

  const collectionsHeader = {
    kicker: designSettings.collections_kicker,
    title: designSettings.collections_title,
    titleAccent: designSettings.collections_title_accent,
    sideNote: designSettings.collections_side_note,
  };

  const newArrivalsSection = {
    tag: designSettings.new_arrivals_tag,
    title: designSettings.new_arrivals_title,
    gatewayLabel: designSettings.new_arrivals_gateway_label,
  };

  const bestsellersSection = {
    tag: designSettings.bestsellers_tag,
    title: designSettings.bestsellers_title,
    gatewayLabel: designSettings.bestsellers_gateway_label,
  };

  const shopLookHeader = {
    kicker: designSettings.shoplook_kicker,
    title: designSettings.shoplook_title,
  };

  return (
    <HomeClient
      heroSlides={heroSlides}
      newArrivals={content.newArrivals}
      bestsellers={content.bestsellers}
      homepageCollections={content.collections}
      lookCards={extras.lookCards}
      lookbookBanner={{
        image: designSettings.lookbook_banner_image,
        label: designSettings.lookbook_banner_label,
        hotspots: extras.bannerHotspots,
      }}
      loomContent={loomContent}
      coinPocketContent={coinPocketContent}
      manifesto={manifesto}
      collectionsHeader={collectionsHeader}
      newArrivalsSection={newArrivalsSection}
      bestsellersSection={bestsellersSection}
      shopLookHeader={shopLookHeader}
    />
  );
}
