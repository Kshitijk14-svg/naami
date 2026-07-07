import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { HotspotListEditor, type HotspotRow } from "@/components/admin/HotspotListEditor";
import { fieldLabelStyle, inputStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  bannerHotspots: HotspotRow[];
  setBannerHotspots: (hotspots: HotspotRow[]) => void;
  bannerError: string | null;
  bannerSaving: boolean;
  bannerSaved: boolean;
  onSave: () => void;
}

export function LookbookBannerSection({
  settings, update, bannerHotspots, setBannerHotspots, bannerError, bannerSaving, bannerSaved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Lookbook Banner
      </h2>
      <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <ImageUploadField
          type="banner"
          image={settings.lookbook_banner_image ?? ""}
          onUploaded={(image) => update("lookbook_banner_image", image)}
        />
        <div>
          <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
            Section Label
          </label>
          <input
            value={settings.lookbook_banner_label ?? ""}
            onChange={(e) => update("lookbook_banner_label", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
            Hotspots
          </p>
          {/* Public banner is a full-width 90vh section (~2:1 on desktop) with object-cover */}
          <HotspotListEditor
            hotspots={bannerHotspots}
            onChange={setBannerHotspots}
            image={settings.lookbook_banner_image ?? ""}
            aspectRatio="2 / 1"
          />
        </div>
        <SaveControl saving={bannerSaving} saved={bannerSaved} error={bannerError} onSave={onSave} label="Save Lookbook Banner" />
      </div>
    </section>
  );
}
