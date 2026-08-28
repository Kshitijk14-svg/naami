import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { sectionLabelStyle, fieldLabelStyle, inputStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  backgroundsError: string | null;
  backgroundsSaving: boolean;
  backgroundsSaved: boolean;
  onSave: () => void;
}

const SECTIONS = [
  { prefix: "hero", label: "Hero Banner" },
  { prefix: "collections", label: "Collections Showcase" },
  { prefix: "loom", label: "Loom Timeline" },
  { prefix: "new_arrivals", label: "New Arrivals Carousel" },
  { prefix: "lookbook_banner", label: "Lookbook Banner" },
  { prefix: "hotspot_cards", label: "Shop The Look" },
  { prefix: "bestsellers", label: "Bestsellers Carousel" },
  { prefix: "coin_pocket", label: "Coin Pocket Card" },
  { prefix: "shared_moments", label: "Shared Moments" },
  { prefix: "manifesto", label: "Manifesto" },
] as const;

export const SECTION_BACKGROUND_KEYS = SECTIONS.flatMap(({ prefix }) => [
  `${prefix}_bg_image`,
  `${prefix}_bg_fit`,
]);

export function SectionBackgroundsSection({
  settings, update, backgroundsError, backgroundsSaving, backgroundsSaved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Section Backgrounds
      </h2>
      <p className="font-sans mb-8" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
        Layer a decorative image behind a section&rsquo;s existing content and color. Use a transparent PNG for
        illustration-style overlays &mdash; the section&rsquo;s base color shows through wherever the image is transparent.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {SECTIONS.map(({ prefix, label }) => {
          const imageKey = `${prefix}_bg_image`;
          const fitKey = `${prefix}_bg_fit`;
          return (
            <div key={prefix} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
              <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
                {label}
              </p>
              <ImageUploadField
                type="section"
                hint="1920 × 1080 transparent PNG for Cover/Contain. For Tile, use a small seamless square (512 × 512) — tiles render at their intrinsic pixel size."
                image={settings[imageKey] ?? ""}
                onUploaded={(image) => update(imageKey, image)}
                allowClear
                onClear={() => update(imageKey, "")}
              />
              <div style={{ maxWidth: 220 }}>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
                  Fit
                </label>
                <select
                  value={settings[fitKey] || "cover"}
                  onChange={(e) => update(fitKey, e.target.value)}
                  style={inputStyle}
                >
                  <option value="cover">Cover (fill, may crop)</option>
                  <option value="contain">Contain (single placement)</option>
                  <option value="tile">Tile (repeat pattern)</option>
                </select>
              </div>
            </div>
          );
        })}
        <SaveControl saving={backgroundsSaving} saved={backgroundsSaved} error={backgroundsError} onSave={onSave} label="Save Section Backgrounds" />
      </div>
    </section>
  );
}
