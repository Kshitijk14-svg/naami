"use client";

import { useState } from "react";
import { sectionLabelStyle, fieldLabelStyle, inputStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  reelsError: string | null;
  reelsSaving: boolean;
  reelsSaved: boolean;
  onSave: () => void;
}

interface PreviewState {
  status: "idle" | "loading" | "ok" | "error";
  thumbnailUrl?: string;
  authorName?: string;
}

function ReelUrlRow({
  slot,
  settings,
  update,
}: {
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}) {
  const key = `instagram_reels_url_${slot}`;
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });

  const handlePreview = async () => {
    const url = settings[key]?.trim();
    if (!url) return;
    setPreview({ status: "loading" });
    try {
      const res = await fetch(`/api/admin/instagram-oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        setPreview({ status: "error" });
        return;
      }
      const data = await res.json();
      setPreview({ status: "ok", thumbnailUrl: data.thumbnailUrl, authorName: data.authorName });
    } catch {
      setPreview({ status: "error" });
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
          Reel {slot} URL
        </label>
        <input
          value={settings[key] ?? ""}
          onChange={(e) => {
            update(key, e.target.value);
            setPreview({ status: "idle" });
          }}
          style={inputStyle}
          placeholder="https://www.instagram.com/reel/..."
        />
      </div>
      <div className="pt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={!settings[key]?.trim() || preview.status === "loading"}
          className="font-sans font-bold uppercase tracking-[0.15em] px-4 py-2.5 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-40"
          style={{ fontSize: "9px", color: "#8B1A1A", background: "none", border: "1px solid rgba(139,26,26,0.3)" }}
        >
          {preview.status === "loading" ? "Checking…" : "Preview"}
        </button>
        {preview.status === "ok" && preview.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of external Instagram CDN thumbnail
          <img src={preview.thumbnailUrl} alt="" className="w-10 h-10 object-cover" />
        )}
        {preview.status === "error" && (
          <span className="font-sans" style={{ fontSize: "10px", color: "#8B1A1A" }}>Couldn&apos;t resolve this URL.</span>
        )}
      </div>
    </div>
  );
}

export function ReelsSection({ settings, update, reelsError, reelsSaving, reelsSaved, onSave }: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Instagram Reels
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Paste up to 6 specific Instagram Reel URLs — only these exact reels are shown on the homepage,
          never an automatic feed of recent posts. Use Preview to confirm a URL resolves before saving.
        </p>

        <label className="font-sans font-bold uppercase tracking-[0.18em] flex items-center gap-2 cursor-pointer" style={{ fontSize: "9px", color: "#111" }}>
          <input
            type="checkbox"
            checked={settings.instagram_reels_enabled === "true"}
            onChange={(e) => update("instagram_reels_enabled", e.target.checked ? "true" : "false")}
            style={{ accentColor: "#8B1A1A" }}
          />
          Show this section on the homepage
        </label>

        <div>
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-4" style={sectionLabelStyle}>
            Section Header
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
              <input value={settings.instagram_reels_kicker ?? ""} onChange={(e) => update("instagram_reels_kicker", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
              <input value={settings.instagram_reels_title ?? ""} onChange={(e) => update("instagram_reels_title", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p className="font-sans font-bold uppercase tracking-[0.22em]" style={sectionLabelStyle}>
            Reel Links
          </p>
          {([1, 2, 3, 4, 5, 6] as const).map((slot) => (
            <ReelUrlRow key={slot} slot={slot} settings={settings} update={update} />
          ))}
        </div>

        <SaveControl saving={reelsSaving} saved={reelsSaved} error={reelsError} onSave={onSave} label="Save Reels" />
      </div>
    </section>
  );
}
