import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { fieldLabelStyle, inputStyle, textareaStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  manifestoError: string | null;
  manifestoSaving: boolean;
  manifestoSaved: boolean;
  onSave: () => void;
}

export function ManifestoSection({ settings, update, manifestoError, manifestoSaving, manifestoSaved, onSave }: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Manifesto
      </h2>
      <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <ImageUploadField
          type="banner"
          image={settings.manifesto_image ?? ""}
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
        <SaveControl saving={manifestoSaving} saved={manifestoSaved} error={manifestoError} onSave={onSave} label="Save Manifesto" />
      </div>
    </section>
  );
}
