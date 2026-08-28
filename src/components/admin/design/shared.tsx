import type { HotspotRow } from "@/components/admin/HotspotListEditor";

export interface ResolvedHotspot {
  id: number;
  topPct: number;
  leftPct: number;
  product: { id: number; name: string; priceInr: number; image: string } | null;
}

export interface LookCard {
  id?: number;
  title: string;
  subtitle: string;
  image: string;
  thumbnailImage: string;
  sortOrder: number;
  isPublished: boolean;
  hotspots: HotspotRow[];
}

export interface SharedMomentVideo {
  id?: number;
  videoUrl: string;
  thumbnailImage: string;
  caption: string;
  sortOrder: number;
}

export function toHotspotRows(resolved: ResolvedHotspot[]): HotspotRow[] {
  return resolved.map((h) => ({
    productId: h.product?.id ?? null,
    topPct: h.topPct,
    leftPct: h.leftPct,
  }));
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#F4F0E6",
  border: "1px solid rgba(139,26,26,0.15)",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#111",
  outline: "none",
  fontFamily: "inherit",
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "80px",
  resize: "vertical",
};

export const sectionLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "#8B1A1A",
};

export const fieldLabelStyle: React.CSSProperties = {
  fontSize: "8px",
  color: "rgba(17,17,17,0.45)",
};

export const saveButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  backgroundColor: "#8B1A1A",
  color: "#F4F0E6",
  border: "none",
};

export const removeCardButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#8B1A1A",
  cursor: "pointer",
  background: "none",
  border: "none",
};

export const addCardButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#8B1A1A",
  cursor: "pointer",
  background: "none",
  border: "1px solid rgba(139,26,26,0.3)",
  padding: "10px 16px",
};

interface SaveControlProps {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
  label: string;
}

export function SaveControl({ saving, saved, error, onSave, label }: SaveControlProps) {
  return (
    <>
      {error && <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{error}</p>}
      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
          style={saveButtonStyle}
        >
          {saving ? "Saving…" : label}
        </button>
        {saved && <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#2E6B3A" }}>Saved ✓</span>}
      </div>
    </>
  );
}
