import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { fieldLabelStyle, inputStyle, textareaStyle, SaveControl } from "./shared";
import { RepeatableListEditor } from "./RepeatableListEditor";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  aboutError: string | null;
  aboutSaving: boolean;
  aboutSaved: boolean;
  onSave: () => void;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <p className="font-sans font-bold uppercase tracking-[0.22em]" style={{ fontSize: "9px", color: "#8B1A1A" }}>{title}</p>
      {children}
    </div>
  );
}

function Text({ settings, update, k, label, multiline }: {
  settings: Record<string, string>; update: (k: string, v: string) => void; k: string; label: string; multiline?: boolean;
}) {
  return (
    <div>
      <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>{label}</label>
      {multiline ? (
        <textarea value={settings[k] ?? ""} onChange={(e) => update(k, e.target.value)} style={textareaStyle} />
      ) : (
        <input value={settings[k] ?? ""} onChange={(e) => update(k, e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}

export function AboutPageSection({ settings, update, aboutError, aboutSaving, aboutSaved, onSave }: Props) {
  const t = (k: string, label: string, multiline?: boolean) => (
    <Text settings={settings} update={update} k={k} label={label} multiline={multiline} />
  );

  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>About Page</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <Group title="Hero">
          {t("about_hero_kicker", "Kicker")}
          {t("about_hero_title", "Title")}
          {t("about_hero_title_accent", "Title Accent")}
          {t("about_hero_subline", "Subline")}
        </Group>

        <Group title="Founding Story">
          <ImageUploadField
            type="banner"
            hint="1080 × 1350 (4:5 portrait)."
            image={settings.about_story_image ?? ""}
            onUploaded={(image) => update("about_story_image", image)}
          />
          {t("about_founding_eyebrow", "Eyebrow")}
          {t("about_founding_body", "Body (blank line between paragraphs)", true)}
        </Group>

        <Group title="Method">
          {t("about_method_kicker", "Kicker")}
          {t("about_method_title", "Title")}
          {t("about_method_title_accent", "Title Accent")}
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>Pillars</label>
            <RepeatableListEditor
              value={settings.about_pillars_json ?? "[]"}
              onChange={(json) => update("about_pillars_json", json)}
              itemLabel="Pillar"
              fields={[
                { key: "number", label: "Number" },
                { key: "title", label: "Title" },
                { key: "description", label: "Description", multiline: true },
              ]}
            />
          </div>
        </Group>

        <Group title="Archive / Timeline">
          {t("about_archive_kicker", "Kicker")}
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>Milestones</label>
            <RepeatableListEditor
              value={settings.about_timeline_json ?? "[]"}
              onChange={(json) => update("about_timeline_json", json)}
              itemLabel="Milestone"
              fields={[
                { key: "year", label: "Year" },
                { key: "event", label: "Event" },
                { key: "detail", label: "Detail", multiline: true },
              ]}
            />
          </div>
        </Group>

        <Group title="Team">
          {t("about_team_kicker", "Kicker")}
          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>Members</label>
            <RepeatableListEditor
              value={settings.about_team_json ?? "[]"}
              onChange={(json) => update("about_team_json", json)}
              itemLabel="Member"
              fields={[
                { key: "name", label: "Name" },
                { key: "title", label: "Role" },
              ]}
            />
          </div>
        </Group>

        <Group title="Closing">
          {t("about_closing_quote", "Quote (rendered in quotation marks)", true)}
          {t("about_closing_attribution", "Attribution")}
          {t("about_closing_cta_label", "Button Label")}
        </Group>

        <SaveControl saving={aboutSaving} saved={aboutSaved} error={aboutError} onSave={onSave} label="Save About Page" />
      </div>
    </section>
  );
}
