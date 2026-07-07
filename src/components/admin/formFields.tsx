import React from "react";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "12px",
  backgroundColor: "#F4F0E6",
  border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111",
  outline: "none",
  fontFamily: "inherit",
};

export const labelCls = "block font-sans font-bold uppercase";
export const labelStyle: React.CSSProperties = {
  fontSize: "8.5px",
  letterSpacing: "0.18em",
  color: "rgba(17,17,17,0.55)",
  marginBottom: 5,
};

export function field(label: string, children: React.ReactNode) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className={labelCls} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function checkboxRow(
  id: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void
) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 14, height: 14, accentColor: "#8B1A1A" }}
      />
      <label htmlFor={id} className={labelCls} style={labelStyle}>
        {label}
      </label>
    </div>
  );
}
