import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { HotspotListEditor, type HotspotRow } from "@/components/admin/HotspotListEditor";
import { fieldLabelStyle, inputStyle, SaveControl } from "./shared";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  bannerHotspots: HotspotRow[];
  setBannerHotspots: (hotspots: HotspotRow[]) => void;
  mobileBannerHotspots: HotspotRow[];
  setMobileBannerHotspots: (hotspots: HotspotRow[]) => void;
  bannerError: string | null;
  bannerSaving: boolean;
  bannerSaved: boolean;
  onSave: () => void;
}

export function LookbookBannerSection({
  settings, update, bannerHotspots, setBannerHotspots, mobileBannerHotspots, setMobileBannerHotspots, bannerError, bannerSaving, bannerSaved, onSave,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Lookbook Banner
      </h2>
      <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <ImageUploadField
          type="banner"
          label="Desktop image"
          hint="1920 × 720 (8:3), shown on tablets and desktops. The banner takes the image's own ratio, so nothing is cropped and hotspots stay pinned. Other ratios work but change the banner height."
          image={settings.lookbook_banner_image ?? ""}
          onUploaded={(image, _thumb, width, height) => {
            update("lookbook_banner_image", image);
            update("lookbook_banner_image_w", String(width));
            update("lookbook_banner_image_h", String(height));
          }}
        />
        <ImageUploadField
          type="banner"
          label="Mobile image"
          hint="1080 × 1350 (4:5), shown on phones. Never cropped. If left empty the desktop image and its hotspots are used on phones."
          image={settings.lookbook_banner_image_mobile ?? ""}
          allowClear
          onClear={() => {
            update("lookbook_banner_image_mobile", "");
            update("lookbook_banner_image_mobile_w", "");
            update("lookbook_banner_image_mobile_h", "");
          }}
          onUploaded={(image, _thumb, width, height) => {
            update("lookbook_banner_image_mobile", image);
            update("lookbook_banner_image_mobile_w", String(width));
            update("lookbook_banner_image_mobile_h", String(height));
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
            Previewing at the image's own ratio keeps hotspot placement — stored as %
            of the image — accurate. The public page remaps those percentages onto the
            visible portion of the image (src/lib/useCoverCrop.ts).
          */}
          <HotspotListEditor
            hotspots={bannerHotspots}
            onChange={setBannerHotspots}
            image={settings.lookbook_banner_image ?? ""}
            aspectRatio={`${settings.lookbook_banner_image_w || "1920"} / ${settings.lookbook_banner_image_h || "720"}`}
          />
        </div>
        {settings.lookbook_banner_image_mobile && (
          <div>
            <p className="font-sans font-bold uppercase tracking-[0.18em] block mb-2" style={fieldLabelStyle}>
              Mobile Hotspots
            </p>
            <HotspotListEditor
              hotspots={mobileBannerHotspots}
              onChange={setMobileBannerHotspots}
              image={settings.lookbook_banner_image_mobile}
              aspectRatio={`${settings.lookbook_banner_image_mobile_w || "1080"} / ${settings.lookbook_banner_image_mobile_h || "1350"}`}
            />
          </div>
        )}
        <SaveControl saving={bannerSaving} saved={bannerSaved} error={bannerError} onSave={onSave} label="Save Lookbook Banner" />
      </div>
    </section>
  );
}
