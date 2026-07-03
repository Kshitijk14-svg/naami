"use client";

import { ProductPicker } from "./ProductPicker";

export interface HotspotRow {
  productId: number | null;
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
}

export function HotspotListEditor({ hotspots, onChange }: HotspotListEditorProps) {
  const updateRow = (idx: number, patch: Partial<HotspotRow>) => {
    onChange(hotspots.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  const removeRow = (idx: number) => {
    onChange(hotspots.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    onChange([...hotspots, { productId: null, topPct: 50, leftPct: 50 }]);
  };

  return (
    <div>
      {hotspots.map((h, idx) => (
        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
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
            onChange={(e) => updateRow(idx, { topPct: Number(e.target.value) })}
            title="Top %"
            placeholder="Top %"
          />
          <input
            type="number"
            min={0}
            max={100}
            style={numberInputStyle}
            value={h.leftPct}
            onChange={(e) => updateRow(idx, { leftPct: Number(e.target.value) })}
            title="Left %"
            placeholder="Left %"
          />
          <button type="button" style={removeButtonStyle} onClick={() => removeRow(idx)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" style={addButtonStyle} onClick={addRow}>
        + Add Hotspot
      </button>
    </div>
  );
}
