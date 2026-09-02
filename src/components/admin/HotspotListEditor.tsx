"use client";

import { useRef, useState } from "react";
import { ProductPicker } from "./ProductPicker";

export interface HotspotRow {
  productId: number | null;
  /** Optional destination URL. When set, the hotspot links here instead of
   *  opening the product quick-add popover (link takes precedence over product). */
  linkUrl: string | null;
  topPct: number;
  leftPct: number;
}

const numberInputStyle: React.CSSProperties = {
  width: 70,
  padding: "8px 10px",
  fontSize: "12px",
  backgroundColor: "#F4F0E6",
  border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111",
  outline: "none",
  fontFamily: "inherit",
};

const removeButtonStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#8B1A1A",
  cursor: "pointer",
  padding: "0 6px",
  background: "none",
  border: "none",
};

const addButtonStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#8B1A1A",
  cursor: "pointer",
  background: "none",
  border: "1px solid rgba(139,26,26,0.3)",
  padding: "8px 14px",
};

interface HotspotListEditorProps {
  hotspots: HotspotRow[];
  onChange: (hotspots: HotspotRow[]) => void;
  /** Banner/card image to place hotspots on. Without it, only the rows render. */
  image?: string;
  /**
   * Aspect ratio of the public container the hotspots render in (e.g. "4 / 5"
   * for look cards). The public site crops with object-cover and positions
   * hotspots relative to the cropped container, so the preview must match or
   * placements land shifted on the live page.
   */
  aspectRatio?: string;
}

// DB stores positions as integer percentages (and the API validates that),
// so round to whole numbers — 1% resolution is plenty for hotspot placement.
function clampPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function HotspotListEditor({ hotspots, onChange, image, aspectRatio }: HotspotListEditorProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const draggingIdx = useRef<number | null>(null);

  const updateRow = (idx: number, patch: Partial<HotspotRow>) => {
    onChange(hotspots.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  const removeRow = (idx: number) => {
    onChange(hotspots.filter((_, i) => i !== idx));
    setSelectedIdx((sel) => {
      if (sel === null) return null;
      if (sel === idx) return null;
      return sel > idx ? sel - 1 : sel;
    });
  };

  const addRow = () => {
    onChange([...hotspots, { productId: null, linkUrl: null, topPct: 50, leftPct: 50 }]);
    setSelectedIdx(hotspots.length);
  };

  const pctFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = previewRef.current!.getBoundingClientRect();
    return {
      leftPct: clampPct(((e.clientX - rect.left) / rect.width) * 100),
      topPct: clampPct(((e.clientY - rect.top) / rect.height) * 100),
    };
  };

  const placeSelected = (e: React.MouseEvent) => {
    if (selectedIdx === null || selectedIdx >= hotspots.length) return;
    updateRow(selectedIdx, pctFromEvent(e));
  };

  const startDrag = (idx: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIdx(idx);
    draggingIdx.current = idx;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent) => {
    if (draggingIdx.current === null) return;
    updateRow(draggingIdx.current, pctFromEvent(e));
  };

  const endDrag = () => {
    draggingIdx.current = null;
  };

  return (
    <div>
      {image && (
        <div style={{ marginBottom: 12 }}>
          <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.5)", marginBottom: 6 }}>
            {selectedIdx !== null && selectedIdx < hotspots.length
              ? `Click or drag on the image to position hotspot ${selectedIdx + 1}.`
              : "Select a hotspot below, then click on the image to place it."}
          </p>
          <div
            ref={previewRef}
            onClick={placeSelected}
            style={{
              position: "relative",
              maxWidth: 520,
              aspectRatio,
              overflow: "hidden",
              border: "1px solid rgba(17,17,17,0.12)",
              cursor: selectedIdx !== null ? "crosshair" : "default",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="hotspot placement preview"
              draggable={false}
              style={
                aspectRatio
                  ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
                  : { width: "100%", display: "block" }
              }
            />
            {hotspots.map((h, idx) => {
              const selected = idx === selectedIdx;
              return (
                <div
                  key={idx}
                  onPointerDown={startDrag(idx)}
                  onPointerMove={onDrag}
                  onPointerUp={endDrag}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIdx(idx);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-sans font-bold"
                  style={{
                    top: `${h.topPct}%`,
                    left: `${h.leftPct}%`,
                    width: selected ? 26 : 20,
                    height: selected ? 26 : 20,
                    borderRadius: "50%",
                    backgroundColor: "#8B1A1A",
                    color: "#F4F0E6",
                    border: selected ? "2px solid #F4F0E6" : "1.5px solid rgba(244,240,230,0.7)",
                    boxShadow: selected ? "0 0 0 2px #8B1A1A" : "0 1px 3px rgba(0,0,0,0.4)",
                    fontSize: "10px",
                    cursor: "grab",
                    zIndex: selected ? 2 : 1,
                  }}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hotspots.map((h, idx) => (
        <div
          key={idx}
          onClick={() => setSelectedIdx(idx)}
          style={{
            marginBottom: 12,
            paddingLeft: 8,
            borderLeft: image && idx === selectedIdx ? "2px solid #8B1A1A" : "2px solid transparent",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            {image && (
              <span className="font-sans font-bold" style={{ fontSize: "10px", color: "#8B1A1A", width: 14, textAlign: "center" }}>
                {idx + 1}
              </span>
            )}
            <div style={{ flex: 1 }}>
              <ProductPicker
                value={h.productId}
                onChange={(productId) => updateRow(idx, { productId })}
              />
            </div>
            <input
              type="number"
              min={0}
              max={100}
              style={numberInputStyle}
              value={h.topPct}
              onChange={(e) => updateRow(idx, { topPct: clampPct(Number(e.target.value)) })}
              title="Top %"
              placeholder="Top %"
            />
            <input
              type="number"
              min={0}
              max={100}
              style={numberInputStyle}
              value={h.leftPct}
              onChange={(e) => updateRow(idx, { leftPct: clampPct(Number(e.target.value)) })}
              title="Left %"
              placeholder="Left %"
            />
            <button type="button" style={removeButtonStyle} onClick={(e) => { e.stopPropagation(); removeRow(idx); }}>
              ✕
            </button>
          </div>
          <div style={{ paddingLeft: image ? 22 : 0 }}>
            <input
              type="text"
              style={{ ...numberInputStyle, width: "100%" }}
              value={h.linkUrl ?? ""}
              onChange={(e) => updateRow(idx, { linkUrl: e.target.value.trim() === "" ? null : e.target.value })}
              title="When set, this hotspot links here instead of opening the product quick-add popover"
              placeholder="Link URL (optional) — e.g. /about, /collection, /our-journey"
            />
          </div>
        </div>
      ))}
      <button type="button" style={addButtonStyle} onClick={addRow}>
        + Add Hotspot
      </button>
    </div>
  );
}
