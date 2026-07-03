"use client";

import { useEffect, useState } from "react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { HotspotListEditor, type HotspotRow } from "@/components/admin/HotspotListEditor";

interface ResolvedHotspot {
  id: number;
  topPct: number;
  leftPct: number;
  product: { id: number; name: string; priceInr: number; image: string } | null;
}

interface LookCard {
  id?: number;
  title: string;
  subtitle: string;
  image: string;
  thumbnailImage: string;
  sortOrder: number;
  isPublished: boolean;
  hotspots: HotspotRow[];
}

function toHotspotRows(resolved: ResolvedHotspot[]): HotspotRow[] {
  return resolved.map((h) => ({
    productId: h.product?.id ?? null,
    topPct: h.topPct,
    leftPct: h.leftPct,
  }));
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#F4F0E6",
  border: "1px solid rgba(139,26,26,0.15)",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#111",
  outline: "none",
  fontFamily: "inherit",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "80px",
  resize: "vertical",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "#8B1A1A",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "8px",
  color: "rgba(17,17,17,0.45)",
};

const saveButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  backgroundColor: "#8B1A1A",
  color: "#F4F0E6",
  border: "none",
};

const removeCardButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#8B1A1A",
  cursor: "pointer",
  background: "none",
  border: "none",
};

const addCardButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#8B1A1A",
  cursor: "pointer",
  background: "none",
  border: "1px solid rgba(139,26,26,0.3)",
  padding: "10px 16px",
};

export default function AdminDesignPage() {
  // ── Hero settings (existing) ──────────────────────────────────────────────
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/design").then((r) => r.json()),
      fetch("/api/admin/homepage-banner-hotspots").then((r) => r.json()),
      fetch("/api/admin/homepage-look-cards").then((r) => r.json()),
    ])
      .then(([designSettings, banner, cards]: [Record<string, string>, ResolvedHotspot[], (LookCard & { hotspots: ResolvedHotspot[] })[]]) => {
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
      })
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
        `loom_panel${n}_image`, `loom_panel${n}_kicker`, `loom_panel${n}_title`, `loom_panel${n}_body`,
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

  const heroSections = [1, 2, 3];

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
          Changes take effect within 5 minutes (Redis TTL). Use full image URLs or paths starting with <code>/images/</code>, or upload a file directly.
        </p>
      </div>

      {loading ? (
        <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.5)" }}>Loading settings…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "56px" }}>

          {/* ── Hero Banner ─────────────────────────────────────────────── */}
          <section>
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
              Hero Banner
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {heroSections.map((n) => (
                <div key={n} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
                  <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
                    Hero Slide {n}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {[
                      { key: `hero_image_${n}`, label: "Image URL" },
                      { key: `hero_title_${n}`, label: "Title" },
                      { key: `hero_subtitle_${n}`, label: "Subtitle" },
                      { key: `hero_tag_${n}`, label: "Tag" },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ gridColumn: key === `hero_image_${n}` ? "1 / -1" : "auto" }}>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
                          {label}
                        </label>
                        <input value={settings[key] ?? ""} onChange={(e) => update(key, e.target.value)} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {heroError && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{heroError}</p>}
              <div className="flex items-center gap-4">
                <button onClick={saveHero} disabled={heroSaving} className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50" style={saveButtonStyle}>
                  {heroSaving ? "Saving…" : "Save Hero Banner"}
                </button>
                {heroSaved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
              </div>
            </div>
          </section>

          {/* ── Lookbook Banner ─────────────────────────────────────────── */}
          <section>
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
              Lookbook Banner
            </h2>
            <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <ImageUploadField
                type="banner"
                image={settings.lookbook_banner_image ?? ""}
                onImageChange={(image) => update("lookbook_banner_image", image)}
                onUploaded={(image) => update("lookbook_banner_image", image)}
              />
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
                  Section Label
                </label>
                <input
                  value={settings.lookbook_banner_label ?? ""}
                  onChange={(e) => update("lookbook_banner_label", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
                  Hotspots
                </p>
                <HotspotListEditor hotspots={bannerHotspots} onChange={setBannerHotspots} />
              </div>
              {bannerError && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{bannerError}</p>}
              <div className="flex items-center gap-4">
                <button onClick={saveBanner} disabled={bannerSaving} className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50" style={saveButtonStyle}>
                  {bannerSaving ? "Saving…" : "Save Lookbook Banner"}
                </button>
                {bannerSaved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
              </div>
            </div>
          </section>

          {/* ── Hotspot Cards ───────────────────────────────────────────── */}
          <section>
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
              Hotspot Cards
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {lookCards.map((card, idx) => (
                <div key={card.id ?? `new-${idx}`} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
                  <div className="flex items-center justify-between mb-5">
                    <p className="font-sans font-bold uppercase tracking-[0.22em]" style={sectionLabelStyle}>
                      Card {idx + 1}
                    </p>
                    <button type="button" style={removeCardButtonStyle} onClick={() => removeLookCard(idx)}>
                      Remove Card
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <ImageUploadField
                      type="lookcard"
                      image={card.image}
                      onImageChange={(image) => updateLookCard(idx, { image })}
                      onUploaded={(image, thumbnailImage) => updateLookCard(idx, { image, thumbnailImage })}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
                        <input value={card.title} onChange={(e) => updateLookCard(idx, { title: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Sort Order</label>
                        <input type="number" value={card.sortOrder} onChange={(e) => updateLookCard(idx, { sortOrder: Number(e.target.value) })} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Subtitle</label>
                      <input value={card.subtitle} onChange={(e) => updateLookCard(idx, { subtitle: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
                        Hotspots
                      </p>
                      <HotspotListEditor
                        hotspots={card.hotspots}
                        onChange={(hotspots) => updateLookCard(idx, { hotspots })}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" style={addCardButtonStyle} onClick={addLookCard}>
                + Add Card
              </button>
              {cardsError && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{cardsError}</p>}
              <div className="flex items-center gap-4">
                <button onClick={saveLookCards} disabled={cardsSaving} className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50" style={saveButtonStyle}>
                  {cardsSaving ? "Saving…" : "Save Hotspot Cards"}
                </button>
                {cardsSaved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
              </div>
            </div>
          </section>

          {/* ── Loom Timeline ───────────────────────────────────────────── */}
          <section>
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
              Loom Timeline
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {[1, 2].map((n) => (
                <div key={n} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
                  <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
                    Panel {n}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <ImageUploadField
                      type="banner"
                      image={settings[`loom_panel${n}_image`] ?? ""}
                      onImageChange={(image) => update(`loom_panel${n}_image`, image)}
                      onUploaded={(image) => update(`loom_panel${n}_image`, image)}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
                        <input value={settings[`loom_panel${n}_kicker`] ?? ""} onChange={(e) => update(`loom_panel${n}_kicker`, e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
                        <input value={settings[`loom_panel${n}_title`] ?? ""} onChange={(e) => update(`loom_panel${n}_title`, e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Body</label>
                      <textarea value={settings[`loom_panel${n}_body`] ?? ""} onChange={(e) => update(`loom_panel${n}_body`, e.target.value)} style={textareaStyle} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
                <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
                  Panel 3 (Finale — no image, uses the logo medallion)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
                      <input value={settings.loom_panel3_kicker ?? ""} onChange={(e) => update("loom_panel3_kicker", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
                      <input value={settings.loom_panel3_title ?? ""} onChange={(e) => update("loom_panel3_title", e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Body</label>
                    <textarea value={settings.loom_panel3_body ?? ""} onChange={(e) => update("loom_panel3_body", e.target.value)} style={textareaStyle} />
                  </div>
                </div>
              </div>
              {loomError && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{loomError}</p>}
              <div className="flex items-center gap-4">
                <button onClick={saveLoom} disabled={loomSaving} className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50" style={saveButtonStyle}>
                  {loomSaving ? "Saving…" : "Save Loom Timeline"}
                </button>
                {loomSaved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
              </div>
            </div>
          </section>

          {/* ── Coin Pocket Card ────────────────────────────────────────── */}
          <section>
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
              Coin Pocket Card
            </h2>
            <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
                  <input value={settings.coinpocket_kicker ?? ""} onChange={(e) => update("coinpocket_kicker", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Season Tag</label>
                  <input value={settings.coinpocket_season_tag ?? ""} onChange={(e) => update("coinpocket_season_tag", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
                  <input value={settings.coinpocket_title ?? ""} onChange={(e) => update("coinpocket_title", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title Accent (italic line)</label>
                  <input value={settings.coinpocket_title_accent ?? ""} onChange={(e) => update("coinpocket_title_accent", e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Description</label>
                <textarea value={settings.coinpocket_description ?? ""} onChange={(e) => update("coinpocket_description", e.target.value)} style={textareaStyle} />
              </div>
              <div>
                <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
                  Authenticity Card Specs
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Spec {n} Label</label>
                        <input value={settings[`coinpocket_spec${n}_label`] ?? ""} onChange={(e) => update(`coinpocket_spec${n}_label`, e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Spec {n} Value</label>
                        <input value={settings[`coinpocket_spec${n}_value`] ?? ""} onChange={(e) => update(`coinpocket_spec${n}_value`, e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Serial Code</label>
                <input value={settings.coinpocket_serial_code ?? ""} onChange={(e) => update("coinpocket_serial_code", e.target.value)} style={inputStyle} />
              </div>
              {coinPocketError && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{coinPocketError}</p>}
              <div className="flex items-center gap-4">
                <button onClick={saveCoinPocket} disabled={coinPocketSaving} className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50" style={saveButtonStyle}>
                  {coinPocketSaving ? "Saving…" : "Save Coin Pocket Card"}
                </button>
                {coinPocketSaved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
              </div>
            </div>
          </section>

          {/* ── Manifesto ────────────────────────────────────────────────── */}
          <section>
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
              Manifesto
            </h2>
            <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <ImageUploadField
                type="banner"
                image={settings.manifesto_image ?? ""}
                onImageChange={(image) => update("manifesto_image", image)}
                onUploaded={(image) => update("manifesto_image", image)}
              />
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
                <input value={settings.manifesto_kicker ?? ""} onChange={(e) => update("manifesto_kicker", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Quote</label>
                <textarea value={settings.manifesto_quote ?? ""} onChange={(e) => update("manifesto_quote", e.target.value)} style={textareaStyle} />
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Attribution</label>
                <input value={settings.manifesto_attribution ?? ""} onChange={(e) => update("manifesto_attribution", e.target.value)} style={inputStyle} />
              </div>
              {manifestoError && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{manifestoError}</p>}
              <div className="flex items-center gap-4">
                <button onClick={saveManifesto} disabled={manifestoSaving} className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50" style={saveButtonStyle}>
                  {manifestoSaving ? "Saving…" : "Save Manifesto"}
                </button>
                {manifestoSaved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
