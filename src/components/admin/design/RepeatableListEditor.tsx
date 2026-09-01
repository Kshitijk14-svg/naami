"use client";

import { useMemo } from "react";
import { addCardButtonStyle, fieldLabelStyle, inputStyle, removeCardButtonStyle, textareaStyle } from "./shared";

export interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
}

interface Props {
  /** JSON string from settings[key] — an array of `Record<string, string>`. */
  value: string;
  /** Called with the re-serialised JSON string; wire to `update(key, json)`. */
  onChange: (json: string) => void;
  fields: FieldDef[];
  /** Singular noun for the add button / row headings, e.g. "Pillar". */
  itemLabel: string;
  min?: number;
  max?: number;
}

type Row = Record<string, string>;

function parseRows(value: string): Row[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Row[]) : [];
  } catch {
    return [];
  }
}

export function RepeatableListEditor({ value, onChange, fields, itemLabel, min = 0, max }: Props) {
  const rows = useMemo(() => parseRows(value), [value]);

  const commit = (next: Row[]) => onChange(JSON.stringify(next));

  const updateField = (idx: number, key: string, fieldValue: string) => {
    commit(rows.map((row, i) => (i === idx ? { ...row, [key]: fieldValue } : row)));
  };

  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));

  const addRow = () => {
    const blank: Row = {};
    for (const field of fields) blank[field.key] = "";
    commit([...rows, blank]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {rows.map((row, idx) => (
        <div
          key={idx}
          style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-sans font-bold uppercase tracking-[0.22em]" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              {itemLabel} {idx + 1}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" style={removeCardButtonStyle} onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up">
                ↑
              </button>
              <button type="button" style={removeCardButtonStyle} onClick={() => move(idx, 1)} disabled={idx === rows.length - 1} title="Move down">
                ↓
              </button>
              {rows.length > min && (
                <button type="button" style={removeCardButtonStyle} onClick={() => removeRow(idx)}>
                  Remove
                </button>
              )}
            </div>
          </div>
          {fields.map((field) => (
            <div key={field.key}>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  value={row[field.key] ?? ""}
                  onChange={(e) => updateField(idx, field.key, e.target.value)}
                  style={textareaStyle}
                />
              ) : (
                <input
                  value={row[field.key] ?? ""}
                  onChange={(e) => updateField(idx, field.key, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      {(max === undefined || rows.length < max) && (
        <button type="button" style={addCardButtonStyle} onClick={addRow}>
          + Add {itemLabel}
        </button>
      )}
    </div>
  );
}
