import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { sectionLabelStyle, fieldLabelStyle, inputStyle, textareaStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  loomError: string | null;
  loomSaving: boolean;
  loomSaved: boolean;
  onSave: () => void;
}

export function LoomTimelineSection({ settings, update, loomError, loomSaving, loomSaved, onSave }: Props) {
  return (
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
                hint="1600 × 1600 (square) — keep the subject inside the centered 1120 × 1200 area."
                image={settings[`loom_panel${n}_image`] ?? ""}
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
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Card Label</label>
                  <input value={settings[`loom_panel${n}_label`] ?? ""} onChange={(e) => update(`loom_panel${n}_label`, e.target.value)} style={inputStyle} />
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
        <SaveControl saving={loomSaving} saved={loomSaved} error={loomError} onSave={onSave} label="Save Loom Timeline" />
      </div>
    </section>
  );
}
