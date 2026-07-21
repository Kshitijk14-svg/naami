"use client";

import { useState } from "react";
import { inputStyle, labelCls, labelStyle } from "./formFields";

export interface SizeStockDraft {
  size: string;
  stock: number;
}

interface SizeStockFieldProps {
  sizes: SizeStockDraft[];
  onChange: (sizes: SizeStockDraft[]) => void;
}

const MAX_SIZE_LENGTH = 10;

export function SizeStockField({ sizes, onChange }: SizeStockFieldProps) {
  const [draft, setDraft] = useState("");

  const addSize = () => {
    const value = draft.trim().slice(0, MAX_SIZE_LENGTH);
    if (!value) return;
    if (sizes.some((s) => s.size.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...sizes, { size: value, stock: 0 }]);
    setDraft("");
  };

  const removeSize = (size: string) => {
    onChange(sizes.filter((s) => s.size !== size));
  };

  const updateStock = (size: string, stock: number) => {
    onChange(sizes.map((s) => (s.size === size ? { ...s, stock } : s)));
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label className={labelCls} style={labelStyle}>
        Sizes &amp; Stock
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {sizes.map(({ size, stock }) => (
          <div
            key={size}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#EDE8DC",
              border: "1px solid rgba(17,17,17,0.15)",
              padding: "6px 10px",
            }}
          >
            <span
              className="font-sans font-bold uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.08em", color: "#111111", flex: "0 0 60px" }}
            >
              {size}
            </span>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => updateStock(size, Math.max(0, Number(e.target.value) || 0))}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Stock"
            />
            <button
              type="button"
              onClick={() => removeSize(size)}
              aria-label={`Remove size ${size}`}
              style={{ cursor: "pointer", color: "#8B1A1A", fontSize: "13px", lineHeight: 1, border: "none", background: "none" }}
            >
              ×
            </button>
          </div>
        ))}
        {sizes.length === 0 && (
          <span className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.4)" }}>
            No sizes added yet — product stock is managed by the Stock field above.
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={inputStyle}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSize();
            }
          }}
          placeholder="Add a size, e.g. XL"
          maxLength={MAX_SIZE_LENGTH}
        />
        <button
          type="button"
          onClick={addSize}
          className="font-sans font-bold uppercase hover:opacity-80 transition-opacity"
          style={{
            fontSize: "9px",
            letterSpacing: "0.14em",
            color: "#F4F0E6",
            backgroundColor: "#8B1A1A",
            padding: "0 16px",
            cursor: "pointer",
            border: "none",
            whiteSpace: "nowrap",
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
