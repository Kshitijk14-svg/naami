import { SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  error: string | null;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

const SECTIONS = [
  { key: "section_collections_enabled", label: "Collections Showcase" },
  { key: "section_loom_enabled", label: "Loom Timeline" },
  { key: "section_new_arrivals_enabled", label: "New Arrivals Carousel" },
  { key: "section_lookbook_banner_enabled", label: "Lookbook Banner" },
  { key: "section_hotspot_cards_enabled", label: "Shop The Look" },
  { key: "section_bestsellers_enabled", label: "Bestsellers Carousel" },
  { key: "section_coin_pocket_enabled", label: "Coin Pocket Card" },
  { key: "section_manifesto_enabled", label: "Manifesto" },
] as const;

export const SECTION_VISIBILITY_KEYS = SECTIONS.map((s) => s.key);

export function SectionVisibilitySection({
  settings, update, error, saving, saved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Section Visibility
      </h2>
      <p className="font-sans mb-8" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
        Show or hide individual home-page sections. The Hero banner and the Footer are always shown.
        Shared Moments has its own switch on the Shared Moments tab.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {SECTIONS.map(({ key, label }) => (
          <label
            key={key}
            className="font-sans font-bold uppercase tracking-[0.18em] flex items-center gap-2 cursor-pointer"
            style={{ fontSize: "9px", color: "#111" }}
          >
            <input
              type="checkbox"
              checked={settings[key] === "true"}
              onChange={(e) => update(key, e.target.checked ? "true" : "false")}
              style={{ accentColor: "#8B1A1A" }}
            />
            {label}
          </label>
        ))}
        <div style={{ marginTop: "16px" }}>
          <SaveControl saving={saving} saved={saved} error={error} onSave={onSave} label="Save Section Visibility" />
        </div>
      </div>
    </section>
  );
}
