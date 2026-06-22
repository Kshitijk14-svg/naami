"use client";

import { useEffect } from "react";

interface Props {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}

export function CrudModal({ isOpen, title, onClose, children, onSubmit, submitLabel = "Save", submitting }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(17,17,17,0.6)", zIndex: 100 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full flex flex-col"
        style={{
          maxWidth: 520,
          maxHeight: "90vh",
          backgroundColor: "#EDE8DC",
          border: "1px solid rgba(17,17,17,0.08)",
          boxShadow: "0 16px 48px rgba(17,17,17,0.2)",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(17,17,17,0.08)",
            backgroundColor: "#EDE8DC",
          }}
        >
          <div style={{ borderLeft: "3px solid #8B1A1A", paddingLeft: 12 }}>
            <h2
              className="font-serif font-light uppercase"
              style={{ fontSize: "1.1rem", color: "#111111", letterSpacing: "0.04em" }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-sans hover:opacity-50 transition-opacity"
            style={{ fontSize: "18px", color: "#111111", lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1" style={{ padding: "20px 24px" }}>
          {children}
        </div>

        {/* Footer */}
        {onSubmit && (
          <div
            className="flex-shrink-0 flex justify-end gap-3"
            style={{ padding: "14px 24px", borderTop: "1px solid rgba(17,17,17,0.08)" }}
          >
            <button
              onClick={onClose}
              className="font-sans font-bold uppercase hover:opacity-60 transition-opacity"
              style={{ fontSize: "9px", letterSpacing: "0.18em", color: "#111111", cursor: "pointer", padding: "8px 16px" }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="font-sans font-bold uppercase hover:opacity-80 transition-opacity disabled:opacity-40"
              style={{
                fontSize: "9px",
                letterSpacing: "0.18em",
                color: "#F4F0E6",
                backgroundColor: "#8B1A1A",
                padding: "8px 20px",
                cursor: "pointer",
              }}
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
