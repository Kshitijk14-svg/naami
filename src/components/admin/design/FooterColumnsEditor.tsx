"use client";

import { useMemo } from "react";
import { addCardButtonStyle, fieldLabelStyle, inputStyle, removeCardButtonStyle } from "./shared";
import type { FooterColumn } from "@/lib/pageContentDefaults";

interface Props {
  /** JSON string from settings.footer_columns_json. */
  value: string;
  onChange: (json: string) => void;
}

function parseColumns(value: string): FooterColumn[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      title: typeof c?.title === "string" ? c.title : "",
      links: Array.isArray(c?.links)
        ? c.links.map((l: unknown) => ({
            label: (l as { label?: string })?.label ?? "",
            href: (l as { href?: string })?.href ?? "",
          }))
        : [],
    }));
  } catch {
    return [];
  }
}

export function FooterColumnsEditor({ value, onChange }: Props) {
  const columns = useMemo(() => parseColumns(value), [value]);
  const commit = (next: FooterColumn[]) => onChange(JSON.stringify(next));

  const updateColumn = (ci: number, patch: Partial<FooterColumn>) =>
    commit(columns.map((col, i) => (i === ci ? { ...col, ...patch } : col)));

  const moveColumn = (ci: number, dir: -1 | 1) => {
    const target = ci + dir;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[ci], next[target]] = [next[target], next[ci]];
    commit(next);
  };

  const updateLink = (ci: number, li: number, patch: Partial<{ label: string; href: string }>) =>
    updateColumn(ci, { links: columns[ci].links.map((l, i) => (i === li ? { ...l, ...patch } : l)) });

  const addLink = (ci: number) => updateColumn(ci, { links: [...columns[ci].links, { label: "", href: "" }] });
  const removeLink = (ci: number, li: number) =>
    updateColumn(ci, { links: columns[ci].links.filter((_, i) => i !== li) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {columns.map((col, ci) => (
        <div
          key={ci}
          style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-sans font-bold uppercase tracking-[0.22em]" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              Column {ci + 1}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" style={removeCardButtonStyle} onClick={() => moveColumn(ci, -1)} disabled={ci === 0} title="Move up">↑</button>
              <button type="button" style={removeCardButtonStyle} onClick={() => moveColumn(ci, 1)} disabled={ci === columns.length - 1} title="Move down">↓</button>
              <button type="button" style={removeCardButtonStyle} onClick={() => commit(columns.filter((_, i) => i !== ci))}>Remove Column</button>
            </div>
          </div>

          <div>
            <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Column Title</label>
            <input value={col.title} onChange={(e) => updateColumn(ci, { title: e.target.value })} style={inputStyle} />
          </div>

          {col.links.map((link, li) => (
            <div key={li} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Link Label</label>
                <input value={link.label} onChange={(e) => updateLink(ci, li, { label: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Href (/path or mailto:)</label>
                <input value={link.href} onChange={(e) => updateLink(ci, li, { href: e.target.value })} style={inputStyle} />
              </div>
              <button type="button" style={{ ...removeCardButtonStyle, paddingBottom: "10px" }} onClick={() => removeLink(ci, li)}>✕</button>
            </div>
          ))}
          <button type="button" style={addCardButtonStyle} onClick={() => addLink(ci)}>+ Add Link</button>
        </div>
      ))}
      <button
        type="button"
        style={addCardButtonStyle}
        onClick={() => commit([...columns, { title: "", links: [] }])}
      >
        + Add Column
      </button>
    </div>
  );
}
