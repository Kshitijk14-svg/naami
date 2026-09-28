import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { sectionLabelStyle, fieldLabelStyle, inputStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  heroError: string | null;
  heroSaving: boolean;
  heroSaved: boolean;
  onSave: () => void;
}

const heroSections = [1, 2, 3];

export function HeroBannerSection({ settings, update, heroError, heroSaving, heroSaved, onSave }: Props) {
  return (
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
            <ImageUploadField
              type="banner"
              hint="Upload at whatever ratio you like — the image fills the section edge-to-edge, cropped and centered as needed. Keep all 3 slides the same size so the slideshow doesn't jump between them. Avoid the bottom-left corner (text overlay), and keep the subject centered since the sides/top/bottom may be trimmed."
              image={settings[`hero_image_${n}`] ?? ""}
              onUploaded={(image, _thumb, width, height) => {
                update(`hero_image_${n}`, image);
                update(`hero_image_${n}_w`, String(width));
                update(`hero_image_${n}_h`, String(height));
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                { key: `hero_title_${n}`, label: "Title" },
                { key: `hero_subtitle_${n}`, label: "Subtitle" },
                { key: `hero_tag_${n}`, label: "Tag" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
                    {label}
                  </label>
                  <input value={settings[key] ?? ""} onChange={(e) => update(key, e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <SaveControl saving={heroSaving} saved={heroSaved} error={heroError} onSave={onSave} label="Save Hero Banner" />
      </div>
    </section>
  );
}
