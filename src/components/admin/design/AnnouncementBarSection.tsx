import { sectionLabelStyle, fieldLabelStyle, inputStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  announcementsError: string | null;
  announcementsSaving: boolean;
  announcementsSaved: boolean;
  onSave: () => void;
}

function AnnouncementSlot({
  slot,
  settings,
  update,
}: {
  slot: 1 | 2;
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
}) {
  const enabledKey = `announcement_${slot}_enabled`;
  const textKey = `announcement_${slot}_text`;
  const linkKey = `announcement_${slot}_link`;

  return (
    <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
      <p className="font-sans font-bold uppercase tracking-[0.22em] mb-5" style={sectionLabelStyle}>
        Announcement {slot}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <label className="font-sans font-bold uppercase tracking-[0.18em] flex items-center gap-2 cursor-pointer" style={{ fontSize: "9px", color: "#111" }}>
          <input
            type="checkbox"
            checked={settings[enabledKey] === "true"}
            onChange={(e) => update(enabledKey, e.target.checked ? "true" : "false")}
            style={{ accentColor: "#8B1A1A" }}
          />
          Enable this announcement
        </label>
        <div>
          <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Text</label>
          <input value={settings[textKey] ?? ""} onChange={(e) => update(textKey, e.target.value)} style={inputStyle} placeholder="Free shipping on all orders above ₹5,000" />
        </div>
        <div>
          <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Link (optional)</label>
          <input value={settings[linkKey] ?? ""} onChange={(e) => update(linkKey, e.target.value)} style={inputStyle} placeholder="/collection" />
        </div>
      </div>
    </div>
  );
}

export function AnnouncementBarSection({
  settings, update, announcementsError, announcementsSaving, announcementsSaved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Announcement Bar
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Shown as a thin bar above the navigation on every storefront page. Enable both slots to cross-fade between them.
        </p>
        <AnnouncementSlot slot={1} settings={settings} update={update} />
        <AnnouncementSlot slot={2} settings={settings} update={update} />
        <SaveControl saving={announcementsSaving} saved={announcementsSaved} error={announcementsError} onSave={onSave} label="Save Announcements" />
      </div>
    </section>
  );
}
