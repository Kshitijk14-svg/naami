import { sectionLabelStyle, fieldLabelStyle, inputStyle, textareaStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  sectionHeadersError: string | null;
  sectionHeadersSaving: boolean;
  sectionHeadersSaved: boolean;
  onSave: () => void;
}

export function SectionHeadersSection({
  settings, update, sectionHeadersError, sectionHeadersSaving, sectionHeadersSaved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Section Headers
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
            Collections Showcase
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
                <input value={settings.collections_kicker ?? ""} onChange={(e) => update("collections_kicker", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
                <input value={settings.collections_title ?? ""} onChange={(e) => update("collections_title", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title Accent</label>
                <input value={settings.collections_title_accent ?? ""} onChange={(e) => update("collections_title_accent", e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Side Note (one line per row)</label>
              <textarea value={settings.collections_side_note ?? ""} onChange={(e) => update("collections_side_note", e.target.value)} style={textareaStyle} />
            </div>
          </div>
        </div>

        <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
            New Arrivals Carousel
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Tag</label>
              <input value={settings.new_arrivals_tag ?? ""} onChange={(e) => update("new_arrivals_tag", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
              <input value={settings.new_arrivals_title ?? ""} onChange={(e) => update("new_arrivals_title", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Gateway Label</label>
              <input value={settings.new_arrivals_gateway_label ?? ""} onChange={(e) => update("new_arrivals_gateway_label", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
            Bestsellers Carousel
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Tag</label>
              <input value={settings.bestsellers_tag ?? ""} onChange={(e) => update("bestsellers_tag", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
              <input value={settings.bestsellers_title ?? ""} onChange={(e) => update("bestsellers_title", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Gateway Label</label>
              <input value={settings.bestsellers_gateway_label ?? ""} onChange={(e) => update("bestsellers_gateway_label", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
            Shop The Look
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
              <input value={settings.shoplook_kicker ?? ""} onChange={(e) => update("shoplook_kicker", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
              <input value={settings.shoplook_title ?? ""} onChange={(e) => update("shoplook_title", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <SaveControl saving={sectionHeadersSaving} saved={sectionHeadersSaved} error={sectionHeadersError} onSave={onSave} label="Save Section Headers" />
      </div>
    </section>
  );
}
