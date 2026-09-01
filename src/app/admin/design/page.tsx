"use client";

import { useEffect, useState } from "react";
import { type HotspotRow } from "@/components/admin/HotspotListEditor";
import { toHotspotRows, sectionLabelStyle, type ResolvedHotspot, type LookCard, type SharedMomentVideo } from "@/components/admin/design/shared";
import { HeroBannerSection } from "@/components/admin/design/HeroBannerSection";
import { LookbookBannerSection } from "@/components/admin/design/LookbookBannerSection";
import { HotspotCardsSection } from "@/components/admin/design/HotspotCardsSection";
import { LoomTimelineSection } from "@/components/admin/design/LoomTimelineSection";
import { CoinPocketSection } from "@/components/admin/design/CoinPocketSection";
import { ManifestoSection } from "@/components/admin/design/ManifestoSection";
import { SectionHeadersSection } from "@/components/admin/design/SectionHeadersSection";
import { FooterDoodleSection } from "@/components/admin/design/FooterDoodleSection";
import { AnnouncementBarSection } from "@/components/admin/design/AnnouncementBarSection";
import { SharedMomentsSection } from "@/components/admin/design/SharedMomentsSection";
import { SectionBackgroundsSection, SECTION_BACKGROUND_KEYS } from "@/components/admin/design/SectionBackgroundsSection";
import { SectionVisibilitySection, SECTION_VISIBILITY_KEYS } from "@/components/admin/design/SectionVisibilitySection";
import { AboutPageSection } from "@/components/admin/design/AboutPageSection";
import { JournalCollectionSection } from "@/components/admin/design/JournalCollectionSection";
import { CheckoutFlowSection } from "@/components/admin/design/CheckoutFlowSection";
import { FooterContentSection } from "@/components/admin/design/FooterContentSection";
import { PAGE_CONTENT_KEYS } from "@/lib/pageContentDefaults";

const ABOUT_KEYS = PAGE_CONTENT_KEYS.filter((k) => k.startsWith("about_"));
const JOURNAL_COLLECTION_KEYS = PAGE_CONTENT_KEYS.filter(
  (k) =>
    k.startsWith("journal_") ||
    k.startsWith("collection_") ||
    k.startsWith("product_") ||
    k === "carousel_quickview_eyebrow_suffix" ||
    k === "manifesto_card_label",
);
const CHECKOUT_FLOW_KEYS = PAGE_CONTENT_KEYS.filter(
  (k) => k.startsWith("cart_") || k.startsWith("checkout_") || k.startsWith("profile_") || k.startsWith("order_"),
);
const FOOTER_CONTENT_KEYS = ["footer_columns_json", "footer_copyright", "footer_tagline"];

const TABS = [
  { id: "hero", label: "Hero Banner" },
  { id: "lookbook", label: "Lookbook Banner" },
  { id: "cards", label: "Hotspot Cards" },
  { id: "loom", label: "Loom Timeline" },
  { id: "coinpocket", label: "Coin Pocket Card" },
  { id: "manifesto", label: "Manifesto" },
  { id: "headers", label: "Section Headers" },
  { id: "visibility", label: "Section Visibility" },
  { id: "backgrounds", label: "Section Backgrounds" },
  { id: "doodle", label: "Footer Doodle" },
  { id: "announcements", label: "Announcements" },
  { id: "shared-moments", label: "Shared Moments" },
  { id: "about", label: "About Page" },
  { id: "journal", label: "Journal & Collection" },
  { id: "checkout", label: "Checkout Flow" },
  { id: "footer", label: "Footer" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminDesignPage() {
  // ── Hero settings (existing) ──────────────────────────────────────────────
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("hero");

  const [heroSaving, setHeroSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);

  // ── Lookbook banner ────────────────────────────────────────────────────────
  const [bannerHotspots, setBannerHotspots] = useState<HotspotRow[]>([]);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // ── Hotspot cards ──────────────────────────────────────────────────────────
  const [lookCards, setLookCards] = useState<LookCard[]>([]);
  const [deletedCardIds, setDeletedCardIds] = useState<number[]>([]);
  const [cardsSaving, setCardsSaving] = useState(false);
  const [cardsSaved, setCardsSaved] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);

  // ── Loom Timeline ──────────────────────────────────────────────────────────
  const [loomSaving, setLoomSaving] = useState(false);
  const [loomSaved, setLoomSaved] = useState(false);
  const [loomError, setLoomError] = useState<string | null>(null);

  // ── Coin Pocket card ────────────────────────────────────────────────────────
  const [coinPocketSaving, setCoinPocketSaving] = useState(false);
  const [coinPocketSaved, setCoinPocketSaved] = useState(false);
  const [coinPocketError, setCoinPocketError] = useState<string | null>(null);

  // ── Manifesto ───────────────────────────────────────────────────────────────
  const [manifestoSaving, setManifestoSaving] = useState(false);
  const [manifestoSaved, setManifestoSaved] = useState(false);
  const [manifestoError, setManifestoError] = useState<string | null>(null);

  // ── Section Headers ────────────────────────────────────────────────────────
  const [sectionHeadersSaving, setSectionHeadersSaving] = useState(false);
  const [sectionHeadersSaved, setSectionHeadersSaved] = useState(false);
  const [sectionHeadersError, setSectionHeadersError] = useState<string | null>(null);

  // ── Section Backgrounds ─────────────────────────────────────────────────────
  const [backgroundsSaving, setBackgroundsSaving] = useState(false);
  const [backgroundsSaved, setBackgroundsSaved] = useState(false);
  const [backgroundsError, setBackgroundsError] = useState<string | null>(null);

  // ── Section Visibility ─────────────────────────────────────────────────────
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilitySaved, setVisibilitySaved] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  // ── Footer Doodle ──────────────────────────────────────────────────────────
  const [doodleSaving, setDoodleSaving] = useState(false);
  const [doodleSaved, setDoodleSaved] = useState(false);
  const [doodleError, setDoodleError] = useState<string | null>(null);

  // ── Announcements ──────────────────────────────────────────────────────────
  const [announcementsSaving, setAnnouncementsSaving] = useState(false);
  const [announcementsSaved, setAnnouncementsSaved] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  // ── Shared Moments ─────────────────────────────────────────────────────────
  const [sharedMomentsSaving, setSharedMomentsSaving] = useState(false);
  const [sharedMomentsSaved, setSharedMomentsSaved] = useState(false);
  const [sharedMomentsError, setSharedMomentsError] = useState<string | null>(null);
  const [sharedMomentVideos, setSharedMomentVideos] = useState<SharedMomentVideo[]>([]);
  const [deletedVideoIds, setDeletedVideoIds] = useState<number[]>([]);
  const [videosSaving, setVideosSaving] = useState(false);
  const [videosSaved, setVideosSaved] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  // ── Non-homepage page content ──────────────────────────────────────────────
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutSaved, setAboutSaved] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutSaved, setCheckoutSaved] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerSaved, setFooterSaved] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/design").then((r) => r.json()),
      fetch("/api/admin/homepage-banner-hotspots").then((r) => r.json()),
      fetch("/api/admin/homepage-look-cards").then((r) => r.json()),
      fetch("/api/admin/homepage-shared-moments").then((r) => r.json()),
    ])
      .then(
        ([designSettings, banner, cards, videos]: [
          Record<string, string>,
          ResolvedHotspot[],
          (LookCard & { hotspots: ResolvedHotspot[] })[],
          SharedMomentVideo[],
        ]) => {
          setSettings(designSettings);
          setBannerHotspots(toHotspotRows(banner));
          setLookCards(
            cards.map((c) => ({
              id: c.id,
              title: c.title,
              subtitle: c.subtitle,
              image: c.image,
              thumbnailImage: c.thumbnailImage ?? "",
              sortOrder: c.sortOrder,
              isPublished: c.isPublished,
              hotspots: toHotspotRows(c.hotspots),
            }))
          );
          setDeletedCardIds([]);
          setSharedMomentVideos(
            videos.map((v) => ({
              id: v.id,
              videoUrl: v.videoUrl,
              thumbnailImage: v.thumbnailImage ?? "",
              caption: v.caption ?? "",
              sortOrder: v.sortOrder,
            }))
          );
          setDeletedVideoIds([]);
        }
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const saveHero = async () => {
    setHeroSaving(true);
    setHeroError(null);
    setHeroSaved(false);
    try {
      const heroKeys = [1, 2, 3].flatMap((n) => [
        `hero_image_${n}`, `hero_title_${n}`, `hero_subtitle_${n}`, `hero_tag_${n}`,
      ]);
      const body: Record<string, string> = {};
      for (const key of heroKeys) body[key] = settings[key] ?? "";

      const res = await fetch("/api/admin/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setHeroError(data.error ?? "Failed to save.");
        return;
      }
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch {
      setHeroError("An error occurred.");
    } finally {
      setHeroSaving(false);
    }
  };

  const saveBanner = async () => {
    setBannerSaving(true);
    setBannerError(null);
    setBannerSaved(false);
    try {
      const settingsRes = await fetch("/api/admin/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookbook_banner_image: settings.lookbook_banner_image ?? "",
          lookbook_banner_label: settings.lookbook_banner_label ?? "",
        }),
      });
      const hotspotsRes = await fetch("/api/admin/homepage-banner-hotspots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotspots: bannerHotspots }),
      });
      if (!settingsRes.ok || !hotspotsRes.ok) {
        const data = await (!settingsRes.ok ? settingsRes : hotspotsRes).json();
        setBannerError(data.error ?? "Failed to save.");
        return;
      }
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 3000);
    } catch {
      setBannerError("An error occurred.");
    } finally {
      setBannerSaving(false);
    }
  };

  const saveSettingsSubset = async (keys: string[]) => {
    const body: Record<string, string> = {};
    for (const key of keys) body[key] = settings[key] ?? "";
    const res = await fetch("/api/admin/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to save.");
    }
  };

  const saveLoom = async () => {
    setLoomSaving(true);
    setLoomError(null);
    setLoomSaved(false);
    try {
      const keys = [1, 2].flatMap((n) => [
        `loom_panel${n}_image`, `loom_panel${n}_kicker`, `loom_panel${n}_title`, `loom_panel${n}_body`, `loom_panel${n}_label`,
      ]).concat(["loom_panel3_kicker", "loom_panel3_title", "loom_panel3_body"]);
      await saveSettingsSubset(keys);
      setLoomSaved(true);
      setTimeout(() => setLoomSaved(false), 3000);
    } catch (err) {
      setLoomError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoomSaving(false);
    }
  };

  const saveCoinPocket = async () => {
    setCoinPocketSaving(true);
    setCoinPocketError(null);
    setCoinPocketSaved(false);
    try {
      const specKeys = [1, 2, 3, 4, 5].flatMap((n) => [`coinpocket_spec${n}_label`, `coinpocket_spec${n}_value`]);
      const keys = [
        "coinpocket_kicker", "coinpocket_title", "coinpocket_title_accent", "coinpocket_description",
        ...specKeys,
        "coinpocket_serial_code", "coinpocket_season_tag",
      ];
      await saveSettingsSubset(keys);
      setCoinPocketSaved(true);
      setTimeout(() => setCoinPocketSaved(false), 3000);
    } catch (err) {
      setCoinPocketError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setCoinPocketSaving(false);
    }
  };

  const saveManifesto = async () => {
    setManifestoSaving(true);
    setManifestoError(null);
    setManifestoSaved(false);
    try {
      await saveSettingsSubset(["manifesto_image", "manifesto_kicker", "manifesto_quote", "manifesto_attribution"]);
      setManifestoSaved(true);
      setTimeout(() => setManifestoSaved(false), 3000);
    } catch (err) {
      setManifestoError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setManifestoSaving(false);
    }
  };

  const saveSectionHeaders = async () => {
    setSectionHeadersSaving(true);
    setSectionHeadersError(null);
    setSectionHeadersSaved(false);
    try {
      await saveSettingsSubset([
        "collections_kicker", "collections_title", "collections_title_accent", "collections_side_note",
        "new_arrivals_tag", "new_arrivals_title", "new_arrivals_gateway_label",
        "bestsellers_tag", "bestsellers_title", "bestsellers_gateway_label",
        "shoplook_kicker", "shoplook_title",
      ]);
      setSectionHeadersSaved(true);
      setTimeout(() => setSectionHeadersSaved(false), 3000);
    } catch (err) {
      setSectionHeadersError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSectionHeadersSaving(false);
    }
  };

  // Generic save for a plain key/value content tab.
  const makeContentSave = (
    keys: string[],
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void,
    setError: (v: string | null) => void,
  ) => async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveSettingsSubset(keys);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = makeContentSave(ABOUT_KEYS, setAboutSaving, setAboutSaved, setAboutError);
  const saveJournalCollection = makeContentSave(JOURNAL_COLLECTION_KEYS, setJournalSaving, setJournalSaved, setJournalError);
  const saveCheckoutFlow = makeContentSave(CHECKOUT_FLOW_KEYS, setCheckoutSaving, setCheckoutSaved, setCheckoutError);
  const saveFooterContent = makeContentSave(FOOTER_CONTENT_KEYS, setFooterSaving, setFooterSaved, setFooterError);
  const saveSectionVisibility = makeContentSave(SECTION_VISIBILITY_KEYS, setVisibilitySaving, setVisibilitySaved, setVisibilityError);

  const saveBackgrounds = async () => {
    setBackgroundsSaving(true);
    setBackgroundsError(null);
    setBackgroundsSaved(false);
    try {
      await saveSettingsSubset(SECTION_BACKGROUND_KEYS);
      setBackgroundsSaved(true);
      setTimeout(() => setBackgroundsSaved(false), 3000);
    } catch (err) {
      setBackgroundsError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setBackgroundsSaving(false);
    }
  };

  const saveDoodle = async () => {
    setDoodleSaving(true);
    setDoodleError(null);
    setDoodleSaved(false);
    try {
      await saveSettingsSubset(["footer_doodle_data", "footer_doodle_enabled"]);
      setDoodleSaved(true);
      setTimeout(() => setDoodleSaved(false), 3000);
    } catch (err) {
      setDoodleError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setDoodleSaving(false);
    }
  };

  const saveAnnouncements = async () => {
    setAnnouncementsSaving(true);
    setAnnouncementsError(null);
    setAnnouncementsSaved(false);
    try {
      await saveSettingsSubset([
        "announcement_1_enabled", "announcement_1_text", "announcement_1_link",
        "announcement_2_enabled", "announcement_2_text", "announcement_2_link",
      ]);
      setAnnouncementsSaved(true);
      setTimeout(() => setAnnouncementsSaved(false), 3000);
    } catch (err) {
      setAnnouncementsError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setAnnouncementsSaving(false);
    }
  };

  const saveSharedMoments = async () => {
    setSharedMomentsSaving(true);
    setSharedMomentsError(null);
    setSharedMomentsSaved(false);
    try {
      await saveSettingsSubset(["shared_moments_enabled", "shared_moments_kicker", "shared_moments_title"]);
      setSharedMomentsSaved(true);
      setTimeout(() => setSharedMomentsSaved(false), 3000);
    } catch (err) {
      setSharedMomentsError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSharedMomentsSaving(false);
    }
  };

  const addSharedMomentVideo = () => {
    setSharedMomentVideos((prev) => [
      ...prev,
      { videoUrl: "", thumbnailImage: "", caption: "", sortOrder: prev.length },
    ]);
  };

  const updateSharedMomentVideo = (idx: number, patch: Partial<SharedMomentVideo>) => {
    setSharedMomentVideos((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeSharedMomentVideo = (idx: number) => {
    setSharedMomentVideos((prev) => {
      const video = prev[idx];
      if (video.id !== undefined) {
        setDeletedVideoIds((ids) => [...ids, video.id!]);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const saveSharedMomentVideos = async () => {
    setVideosSaving(true);
    setVideosError(null);
    setVideosSaved(false);
    try {
      for (const videoId of deletedVideoIds) {
        await fetch(`/api/admin/homepage-shared-moments/${videoId}`, { method: "DELETE" });
      }
      for (const video of sharedMomentVideos) {
        if (!video.videoUrl) continue;
        const body = {
          videoUrl: video.videoUrl,
          thumbnailImage: video.thumbnailImage || undefined,
          caption: video.caption,
          sortOrder: video.sortOrder,
        };
        const url = video.id ? `/api/admin/homepage-shared-moments/${video.id}` : "/api/admin/homepage-shared-moments";
        const method = video.id ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setVideosError(data.error ?? "Failed to save videos.");
          return;
        }
      }
      loadAll();
      setVideosSaved(true);
      setTimeout(() => setVideosSaved(false), 3000);
    } catch {
      setVideosError("An error occurred.");
    } finally {
      setVideosSaving(false);
    }
  };

  const addLookCard = () => {
    setLookCards((prev) => [
      ...prev,
      { title: "", subtitle: "", image: "", thumbnailImage: "", sortOrder: prev.length, isPublished: true, hotspots: [] },
    ]);
  };

  const updateLookCard = (idx: number, patch: Partial<LookCard>) => {
    setLookCards((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeLookCard = (idx: number) => {
    setLookCards((prev) => {
      const card = prev[idx];
      if (card.id !== undefined) {
        setDeletedCardIds((ids) => [...ids, card.id!]);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const saveLookCards = async () => {
    setCardsSaving(true);
    setCardsError(null);
    setCardsSaved(false);
    try {
      for (const cardId of deletedCardIds) {
        await fetch(`/api/admin/homepage-look-cards/${cardId}`, { method: "DELETE" });
      }
      for (const card of lookCards) {
        const body = {
          title: card.title,
          subtitle: card.subtitle,
          image: card.image,
          thumbnailImage: card.thumbnailImage || undefined,
          sortOrder: card.sortOrder,
          isPublished: card.isPublished,
          hotspots: card.hotspots,
        };
        const url = card.id ? `/api/admin/homepage-look-cards/${card.id}` : "/api/admin/homepage-look-cards";
        const method = card.id ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setCardsError(data.error ?? "Failed to save look cards.");
          return;
        }
      }
      loadAll();
      setCardsSaved(true);
      setTimeout(() => setCardsSaved(false), 3000);
    } catch {
      setCardsError("An error occurred.");
    } finally {
      setCardsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-10">
        <span className="font-sans font-bold uppercase tracking-[0.3em] block mb-2" style={sectionLabelStyle}>
          NAAMI // STUDIO
        </span>
        <h1 className="font-serif font-light uppercase" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: "#111", letterSpacing: "0.02em" }}>
          Design Manager
        </h1>
        <p className="font-sans mt-3" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Changes take effect within 5 minutes (Redis TTL). Upload images directly — they are compressed automatically.
        </p>
      </div>

      {loading ? (
        <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.5)" }}>Loading settings…</p>
      ) : (
        <>
          <div
            className="flex flex-wrap gap-1 mb-10"
            style={{ borderBottom: "1px solid rgba(139,26,26,0.15)" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="font-sans font-bold uppercase tracking-[0.18em] cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  fontSize: "9px",
                  padding: "12px 16px",
                  color: activeTab === tab.id ? "#8B1A1A" : "rgba(17,17,17,0.5)",
                  borderBottom: activeTab === tab.id ? "2px solid #8B1A1A" : "2px solid transparent",
                  marginBottom: "-1px",
                  background: "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "hero" && (
            <HeroBannerSection settings={settings} update={update} heroError={heroError} heroSaving={heroSaving} heroSaved={heroSaved} onSave={saveHero} />
          )}
          {activeTab === "lookbook" && (
            <LookbookBannerSection
              settings={settings}
              update={update}
              bannerHotspots={bannerHotspots}
              setBannerHotspots={setBannerHotspots}
              bannerError={bannerError}
              bannerSaving={bannerSaving}
              bannerSaved={bannerSaved}
              onSave={saveBanner}
            />
          )}
          {activeTab === "cards" && (
            <HotspotCardsSection
              lookCards={lookCards}
              addLookCard={addLookCard}
              updateLookCard={updateLookCard}
              removeLookCard={removeLookCard}
              cardsError={cardsError}
              cardsSaving={cardsSaving}
              cardsSaved={cardsSaved}
              onSave={saveLookCards}
            />
          )}
          {activeTab === "loom" && (
            <LoomTimelineSection settings={settings} update={update} loomError={loomError} loomSaving={loomSaving} loomSaved={loomSaved} onSave={saveLoom} />
          )}
          {activeTab === "coinpocket" && (
            <CoinPocketSection settings={settings} update={update} coinPocketError={coinPocketError} coinPocketSaving={coinPocketSaving} coinPocketSaved={coinPocketSaved} onSave={saveCoinPocket} />
          )}
          {activeTab === "manifesto" && (
            <ManifestoSection settings={settings} update={update} manifestoError={manifestoError} manifestoSaving={manifestoSaving} manifestoSaved={manifestoSaved} onSave={saveManifesto} />
          )}
          {activeTab === "headers" && (
            <SectionHeadersSection
              settings={settings}
              update={update}
              sectionHeadersError={sectionHeadersError}
              sectionHeadersSaving={sectionHeadersSaving}
              sectionHeadersSaved={sectionHeadersSaved}
              onSave={saveSectionHeaders}
            />
          )}
          {activeTab === "visibility" && (
            <SectionVisibilitySection
              settings={settings}
              update={update}
              error={visibilityError}
              saving={visibilitySaving}
              saved={visibilitySaved}
              onSave={saveSectionVisibility}
            />
          )}
          {activeTab === "backgrounds" && (
            <SectionBackgroundsSection
              settings={settings}
              update={update}
              backgroundsError={backgroundsError}
              backgroundsSaving={backgroundsSaving}
              backgroundsSaved={backgroundsSaved}
              onSave={saveBackgrounds}
            />
          )}
          {activeTab === "doodle" && (
            <FooterDoodleSection settings={settings} update={update} doodleError={doodleError} doodleSaving={doodleSaving} doodleSaved={doodleSaved} onSave={saveDoodle} />
          )}
          {activeTab === "announcements" && (
            <AnnouncementBarSection
              settings={settings}
              update={update}
              announcementsError={announcementsError}
              announcementsSaving={announcementsSaving}
              announcementsSaved={announcementsSaved}
              onSave={saveAnnouncements}
            />
          )}
          {activeTab === "about" && (
            <AboutPageSection
              settings={settings}
              update={update}
              aboutError={aboutError}
              aboutSaving={aboutSaving}
              aboutSaved={aboutSaved}
              onSave={saveAbout}
            />
          )}
          {activeTab === "journal" && (
            <JournalCollectionSection
              settings={settings}
              update={update}
              journalError={journalError}
              journalSaving={journalSaving}
              journalSaved={journalSaved}
              onSave={saveJournalCollection}
            />
          )}
          {activeTab === "checkout" && (
            <CheckoutFlowSection
              settings={settings}
              update={update}
              checkoutError={checkoutError}
              checkoutSaving={checkoutSaving}
              checkoutSaved={checkoutSaved}
              onSave={saveCheckoutFlow}
            />
          )}
          {activeTab === "footer" && (
            <FooterContentSection
              settings={settings}
              update={update}
              footerError={footerError}
              footerSaving={footerSaving}
              footerSaved={footerSaved}
              onSave={saveFooterContent}
            />
          )}
          {activeTab === "shared-moments" && (
            <SharedMomentsSection
              settings={settings}
              update={update}
              sharedMomentsError={sharedMomentsError}
              sharedMomentsSaving={sharedMomentsSaving}
              sharedMomentsSaved={sharedMomentsSaved}
              onSave={saveSharedMoments}
              videos={sharedMomentVideos}
              addVideo={addSharedMomentVideo}
              updateVideo={updateSharedMomentVideo}
              removeVideo={removeSharedMomentVideo}
              videosError={videosError}
              videosSaving={videosSaving}
              videosSaved={videosSaved}
              onSaveVideos={saveSharedMomentVideos}
            />
          )}
        </>
      )}
    </div>
  );
}
