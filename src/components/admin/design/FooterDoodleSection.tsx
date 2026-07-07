import { DoodleEditor } from "@/components/admin/DoodleEditor";
import { SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  doodleError: string | null;
  doodleSaving: boolean;
  doodleSaved: boolean;
  onSave: () => void;
}

export function FooterDoodleSection({ settings, update, doodleError, doodleSaving, doodleSaved, onSave }: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Footer Doodle
      </h2>
      <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Draw a freehand message. It appears at the bottom-right of the site footer next to the NAAMI wordmark.
        </p>
        <label className="font-sans font-bold uppercase tracking-[0.18em] flex items-center gap-2 cursor-pointer" style={{ fontSize: "9px", color: "#111" }}>
          <input
            type="checkbox"
            checked={settings.footer_doodle_enabled === "true"}
            onChange={(e) => update("footer_doodle_enabled", e.target.checked ? "true" : "false")}
            style={{ accentColor: "#8B1A1A" }}
          />
          Show doodle in footer
        </label>
        <DoodleEditor
          value={settings.footer_doodle_data ?? ""}
          onChange={(v) => update("footer_doodle_data", v)}
        />
        <SaveControl saving={doodleSaving} saved={doodleSaved} error={doodleError} onSave={onSave} label="Save Footer Doodle" />
      </div>
    </section>
  );
}
