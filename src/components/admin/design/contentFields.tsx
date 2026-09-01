import { fieldLabelStyle, inputStyle, textareaStyle } from "./shared";

/** A labelled left-border group of related content fields. */
export function ContentGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <p className="font-sans font-bold uppercase tracking-[0.22em]" style={{ fontSize: "9px", color: "#8B1A1A" }}>{title}</p>
      {children}
    </div>
  );
}

/** A single text (or multiline) setting field bound to `settings[k]`. */
export function ContentField({ settings, update, fieldKey, label, multiline }: {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  fieldKey: string;
  label: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>{label}</label>
      {multiline ? (
        <textarea value={settings[fieldKey] ?? ""} onChange={(e) => update(fieldKey, e.target.value)} style={textareaStyle} />
      ) : (
        <input value={settings[fieldKey] ?? ""} onChange={(e) => update(fieldKey, e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}
