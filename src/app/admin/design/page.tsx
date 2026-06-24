"use client";

import { useEffect, useState } from "react";

const SETTING_LABELS: Record<string, string> = {
  hero_image_1: "Hero Image 1 URL",
  hero_image_2: "Hero Image 2 URL",
  hero_image_3: "Hero Image 3 URL",
  hero_title_1: "Hero Title 1",
  hero_title_2: "Hero Title 2",
  hero_title_3: "Hero Title 3",
  hero_subtitle_1: "Hero Subtitle 1",
  hero_subtitle_2: "Hero Subtitle 2",
  hero_subtitle_3: "Hero Subtitle 3",
  hero_tag_1: "Hero Tag 1",
  hero_tag_2: "Hero Tag 2",
  hero_tag_3: "Hero Tag 3",
};

export default function AdminDesignPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/design")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    backgroundColor: "#F4F0E6",
    border: "1px solid rgba(139,26,26,0.15)",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#111",
    outline: "none",
    fontFamily: "inherit",
  };

  const heroSections = [1, 2, 3];

  return (
    <div>
      <div className="mb-10">
        <span className="font-sans font-bold uppercase tracking-[0.3em] block mb-2" style={{ fontSize: "9px", color: "#8B1A1A" }}>
          NAAMI // STUDIO
        </span>
        <h1 className="font-serif font-light uppercase" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: "#111", letterSpacing: "0.02em" }}>
          Design Manager
        </h1>
        <p className="font-sans mt-3" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Changes take effect within 1 hour (Redis TTL). Use full image URLs or paths starting with <code>/images/</code>.
        </p>
      </div>

      {loading ? (
        <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.5)" }}>Loading settings…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {heroSections.map((n) => (
            <div key={n} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
              <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={{ fontSize: "9px", color: "#8B1A1A" }}>
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
                    <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={{ fontSize: "8px", color: "rgba(17,17,17,0.45)" }}>
                      {label}
                    </label>
                    <input
                      value={settings[key] ?? ""}
                      onChange={(e) => update(key, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{error}</p>}

          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={saving}
              className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
              style={{ fontSize: "9px", backgroundColor: "#8B1A1A", color: "#F4F0E6", border: "none" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>
                Saved ✓
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
