import { SaveControl } from "./shared";
import { ContentField, ContentGroup } from "./contentFields";
import { FooterColumnsEditor } from "./FooterColumnsEditor";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  footerError: string | null;
  footerSaving: boolean;
  footerSaved: boolean;
  onSave: () => void;
}

export function FooterContentSection({ settings, update, footerError, footerSaving, footerSaved, onSave }: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>Footer</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <ContentGroup title="Link Columns">
          <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
            The &ldquo;Contact Support&rdquo; mail link is still added automatically from the
            NEXT_PUBLIC_CONTACT_EMAIL environment variable to whichever column is titled
            &ldquo;Customer Care&rdquo;.
          </p>
          <FooterColumnsEditor
            value={settings.footer_columns_json ?? "[]"}
            onChange={(json) => update("footer_columns_json", json)}
          />
        </ContentGroup>

        <ContentGroup title="Bottom Bar">
          <ContentField settings={settings} update={update} fieldKey="footer_copyright" label="Copyright Line" />
          <ContentField settings={settings} update={update} fieldKey="footer_tagline" label="Tagline" />
        </ContentGroup>

        <SaveControl saving={footerSaving} saved={footerSaved} error={footerError} onSave={onSave} label="Save Footer" />
      </div>
    </section>
  );
}
