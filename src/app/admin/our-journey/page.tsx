"use client";

import { useEffect, useState } from "react";
import { RepeatableListEditor } from "@/components/admin/design/RepeatableListEditor";
import { ContentField, ContentGroup } from "@/components/admin/design/contentFields";
import { SaveControl } from "@/components/admin/design/shared";

const KEYS = [
  "our_journey_kicker",
  "our_journey_title",
  "our_journey_title_accent",
  "our_journey_empty_state",
  "our_journey_json",
] as const;

export default function AdminOurJourneyPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/design")
      .then((r) => r.json())
      .then((data: Record<string, string>) => setSettings(data))
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(KEYS.map((k) => [k, settings[k] ?? ""]));
      const res = await fetch("/api/admin/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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

  return (
    <div>
      <div className="mb-10">
        <span className="font-sans font-bold uppercase tracking-[0.3em] block mb-2" style={{ fontSize: "9px", color: "#8B1A1A" }}>
          NAAMI // OUR JOURNEY
        </span>
        <h1 className="font-serif font-light uppercase" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: "#111", letterSpacing: "0.02em" }}>
          Our Journey
        </h1>
        <p className="font-sans mt-3" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6, maxWidth: "48ch" }}>
          The images and captions shown on the public <code>/our-journey</code> page, in order. Each stop is a portrait image with a short caption.
        </p>
      </div>

      {loading ? (
        <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.5)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "640px" }}>
          <ContentGroup title="Page Header">
            <ContentField settings={settings} update={update} fieldKey="our_journey_kicker" label="Kicker" />
            <ContentField settings={settings} update={update} fieldKey="our_journey_title" label="Title (new line = line break)" multiline />
            <ContentField settings={settings} update={update} fieldKey="our_journey_title_accent" label="Title Accent (uppercase line under the title — clear to hide)" />
            <ContentField settings={settings} update={update} fieldKey="our_journey_empty_state" label="Empty State (shown when there are no stops)" />
          </ContentGroup>

          <div>
            <p className="font-sans font-bold uppercase tracking-[0.22em] mb-3" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              Stops
            </p>
            <RepeatableListEditor
              value={settings.our_journey_json ?? "[]"}
              onChange={(json) => update("our_journey_json", json)}
              imageType="journey"
              itemLabel="Stop"
              fields={[
                { key: "image", label: "Image (portrait, e.g. 900 × 1200)", type: "image" },
                { key: "caption", label: "Caption", type: "text" },
              ]}
            />
          </div>

          <SaveControl saving={saving} saved={saved} error={error} onSave={save} label="Save Our Journey" />
        </div>
      )}
    </div>
  );
}
