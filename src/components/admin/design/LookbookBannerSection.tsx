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
          hint="Upload at whatever ratio you like — the full image is always shown, never cropped. If it doesn't match the section's shape you'll see the background color on the sides or top/bottom; hotspots stay pinned to the image either way."
          image={settings.lookbook_banner_image ?? ""}
          onUploaded={(image, _thumb, width, height) => {
            update("lookbook_banner_image", image);
            update("lookbook_banner_image_w", String(width));
            update("lookbook_banner_image_h", String(height));
          }}
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
          {/*
            The public banner keeps a fixed viewport-height section and letterboxes the
            image at its own aspect ratio (no crop). Previewing at that same ratio here
            keeps hotspot placement — stored as % of the image — accurate; the public
            page maps those percentages onto the letterboxed image's actual on-screen
            rectangle (src/lib/useFitBox.ts), so they track correctly on every device.
          */}
          <HotspotListEditor
            hotspots={bannerHotspots}
            onChange={setBannerHotspots}
            image={settings.lookbook_banner_image ?? ""}
            aspectRatio={`${settings.lookbook_banner_image_w ?? "1600"} / ${settings.lookbook_banner_image_h ?? "1600"}`}
          />
        </div>
        <SaveControl saving={bannerSaving} saved={bannerSaved} error={bannerError} onSave={onSave} label="Save Lookbook Banner" />
      </div>
    </section>
  );
}
