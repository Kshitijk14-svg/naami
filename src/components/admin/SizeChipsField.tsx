"use client";

import { useState } from "react";
import { inputStyle, labelCls, labelStyle } from "./formFields";

interface SizeChipsFieldProps {
  sizes: string[];
  onChange: (sizes: string[]) => void;
}

const MAX_SIZE_LENGTH = 10;

export function SizeChipsField({ sizes, onChange }: SizeChipsFieldProps) {
  const [draft, setDraft] = useState("");

  const addSize = () => {
    const value = draft.trim().slice(0, MAX_SIZE_LENGTH);
    if (!value) return;
    if (sizes.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...sizes, value]);
    setDraft("");
  };

  const removeSize = (size: string) => {
    onChange(sizes.filter((s) => s !== size));
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label className={labelCls} style={labelStyle}>
        Sizes
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {sizes.map((size) => (
          <span
            key={size}
            className="font-sans font-bold uppercase"
            style={{
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "#111111",
              backgroundColor: "#EDE8DC",
              border: "1px solid rgba(17,17,17,0.15)",
              padding: "5px 8px 5px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {size}
            <button
              type="button"
              onClick={() => removeSize(size)}
              aria-label={`Remove size ${size}`}
              style={{ cursor: "pointer", color: "#8B1A1A", fontSize: "13px", lineHeight: 1, border: "none", background: "none" }}
            >
              ×
            </button>
          </span>
        ))}
        {sizes.length === 0 && (
          <span className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.4)" }}>
            No sizes added yet
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
