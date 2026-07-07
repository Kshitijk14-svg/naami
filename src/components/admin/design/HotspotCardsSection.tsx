import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { HotspotListEditor } from "@/components/admin/HotspotListEditor";
import {
  sectionLabelStyle, fieldLabelStyle, inputStyle,
  removeCardButtonStyle, addCardButtonStyle, SaveControl,
  type LookCard,
} from "./shared";

interface Props {
  lookCards: LookCard[];
  addLookCard: () => void;
  updateLookCard: (idx: number, patch: Partial<LookCard>) => void;
  removeLookCard: (idx: number) => void;
  cardsError: string | null;
  cardsSaving: boolean;
  cardsSaved: boolean;
  onSave: () => void;
}

export function HotspotCardsSection({
  lookCards, addLookCard, updateLookCard, removeLookCard, cardsError, cardsSaving, cardsSaved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Hotspot Cards
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {lookCards.map((card, idx) => (
          <div key={card.id ?? `new-${idx}`} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-sans font-bold uppercase tracking-[0.22em]" style={sectionLabelStyle}>
                Card {idx + 1}
              </p>
              <button type="button" style={removeCardButtonStyle} onClick={() => removeLookCard(idx)}>
                Remove Card
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ImageUploadField
                type="lookcard"
                image={card.image}
                onUploaded={(image, thumbnailImage) => updateLookCard(idx, { image, thumbnailImage })}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
                  <input value={card.title} onChange={(e) => updateLookCard(idx, { title: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Sort Order</label>
                  <input type="number" value={card.sortOrder} onChange={(e) => updateLookCard(idx, { sortOrder: Number(e.target.value) })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Subtitle</label>
                <input value={card.subtitle} onChange={(e) => updateLookCard(idx, { subtitle: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
                  Hotspots
                </p>
                <HotspotListEditor
                  hotspots={card.hotspots}
                  onChange={(hotspots) => updateLookCard(idx, { hotspots })}
                  image={card.image}
                  aspectRatio="4 / 5"
                />
              </div>
            </div>
          </div>
        ))}
        <button type="button" style={addCardButtonStyle} onClick={addLookCard}>
          + Add Card
        </button>
        <SaveControl saving={cardsSaving} saved={cardsSaved} error={cardsError} onSave={onSave} label="Save Hotspot Cards" />
      </div>
    </section>
  );
}
