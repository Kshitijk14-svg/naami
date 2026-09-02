import { SaveControl } from "./shared";
import { ContentField, ContentGroup } from "./contentFields";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  journalError: string | null;
  journalSaving: boolean;
  journalSaved: boolean;
  onSave: () => void;
}

export function JournalCollectionSection({ settings, update, journalError, journalSaving, journalSaved, onSave }: Props) {
  const f = (fieldKey: string, label: string, multiline?: boolean) => (
    <ContentField settings={settings} update={update} fieldKey={fieldKey} label={label} multiline={multiline} />
  );

  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>Collection &amp; Product</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <ContentGroup title="Collection">
          {f("collection_fallback_eyebrow", "Fallback Eyebrow (when no collection tag)")}
          {f("collection_fallback_title", "Fallback Title")}
          {f("collection_fallback_title_accent", "Fallback Title Accent")}
          {f("collection_filter_all_label", "\"All\" Filter Label")}
          {f("collection_select_size_label", "Select-Size Label")}
          {f("collection_add_to_wardrobe_label", "Add-to-Wardrobe Button")}
        </ContentGroup>

        <ContentGroup title="Product &amp; Quick-View">
          {f("collection_quickview_eyebrow_suffix", "Collection Quick-View Eyebrow Suffix")}
          {f("carousel_quickview_eyebrow_suffix", "Homepage Carousel Eyebrow Suffix")}
          {f("product_eyebrow_suffix", "Product Page Eyebrow Suffix")}
          {f("product_add_to_wardrobe_label", "Product Add-to-Wardrobe Button")}
          {f("product_view_cart_label", "Product \"View Cart\" Label")}
          {f("manifesto_card_label", "Homepage Manifesto Card Label")}
        </ContentGroup>

        <SaveControl saving={journalSaving} saved={journalSaved} error={journalError} onSave={onSave} label="Save Collection & Product" />
      </div>
    </section>
  );
}
