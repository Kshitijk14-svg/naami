"use client";

import { inputStyle, labelCls, labelStyle } from "./formFields";

export interface MetafieldDraft {
  name: string;
  description: string;
}

interface MetafieldsFieldProps {
  metafields: MetafieldDraft[];
  onChange: (metafields: MetafieldDraft[]) => void;
}

export function MetafieldsField({ metafields, onChange }: MetafieldsFieldProps) {
  const update = (index: number, patch: Partial<MetafieldDraft>) => {
    onChange(metafields.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const remove = (index: number) => {
    onChange(metafields.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...metafields, { name: "", description: "" }]);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label className={labelCls} style={labelStyle}>
        Metafields
      </label>
      <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)", marginBottom: 10 }}>
        Custom spec rows shown on the product page — e.g. name &quot;Material&quot;, description &quot;the material is cotton&quot;.
      </p>
      {metafields.map((m, index) => (
        <div key={index} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
          <input
            style={{ ...inputStyle, flex: "0 0 30%" }}
            value={m.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="Name (e.g. Material)"
            maxLength={100}
          />
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={m.description}
            onChange={(e) => update(index, { description: e.target.value })}
            placeholder="Description (e.g. the material is cotton)"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label="Remove metafield"
            className="hover:opacity-60 transition-opacity"
            style={{
              flex: "0 0 auto",
              padding: "8px 10px",
              cursor: "pointer",
              color: "#8B1A1A",
              border: "1px solid rgba(139,26,26,0.3)",
              background: "none",
              fontSize: "11px",
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="font-sans font-bold uppercase hover:opacity-80 transition-opacity"
        style={{
          fontSize: "9px",
          letterSpacing: "0.14em",
          color: "#111111",
          backgroundColor: "transparent",
          border: "1px solid rgba(17,17,17,0.2)",
          padding: "7px 14px",
          cursor: "pointer",
        }}
      >
        + Add metafield
      </button>
    </div>
  );
}
