"use client";

import { useEffect } from "react";

interface Props {
  onClose: () => void;
}

const SIZE_CHART = [
  { size: "XS", chest: '34"', waist: '28"', hip: '36"', chestCm: "86", waistCm: "71", hipCm: "91" },
  { size: "S",  chest: '36"', waist: '30"', hip: '38"', chestCm: "91", waistCm: "76", hipCm: "97" },
  { size: "M",  chest: '38"', waist: '32"', hip: '40"', chestCm: "97", waistCm: "81", hipCm: "102" },
  { size: "L",  chest: '40"', waist: '34"', hip: '42"', chestCm: "102", waistCm: "86", hipCm: "107" },
  { size: "XL", chest: '42"', waist: '36"', hip: '44"', chestCm: "107", waistCm: "91", hipCm: "112" },
  { size: "XXL",chest: '44"', waist: '38"', hip: '46"', chestCm: "112", waistCm: "97", hipCm: "117" },
];

export default function SizeGuideModal({ onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, backgroundColor: "rgba(17,17,17,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl mx-4 overflow-auto max-h-[90vh]"
        style={{ backgroundColor: "#F4F0E6", borderTop: "3px solid #8B1A1A" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(139,26,26,0.12)" }}>
          <div>
            <p className="font-sans font-bold uppercase tracking-[0.28em] mb-1" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              NAAMI // FIT GUIDE
            </p>
            <h2 className="font-serif font-light uppercase" style={{ fontSize: "1.5rem", color: "#111", letterSpacing: "0.03em" }}>
              Size Chart
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-sans font-bold hover:opacity-50 transition-opacity cursor-pointer"
            style={{ fontSize: "20px", color: "#111", lineHeight: 1 }}
            aria-label="Close size guide"
          >
            ×
          </button>
        </div>

        {/* Measurement note */}
        <p className="px-8 pt-5 pb-3 font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Measurements are of the <strong>body</strong>, not the garment. For a relaxed fit, size up one.
        </p>

        {/* Table */}
        <div className="px-8 pb-8 overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Size", "Chest", "Waist", "Hip", "Chest cm", "Waist cm", "Hip cm"].map((h) => (
                  <th
                    key={h}
                    className="font-sans font-bold uppercase text-left"
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.2em",
                      color: "#8B1A1A",
                      padding: "0 12px 10px 0",
                      borderBottom: "1px solid rgba(139,26,26,0.15)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row, i) => (
                <tr key={row.size} style={{ backgroundColor: i % 2 === 0 ? "transparent" : "rgba(139,26,26,0.03)" }}>
                  {[row.size, row.chest, row.waist, row.hip, `${row.chestCm} cm`, `${row.waistCm} cm`, `${row.hipCm} cm`].map((val, j) => (
                    <td
                      key={j}
                      className="font-sans"
                      style={{
                        fontSize: j === 0 ? "12px" : "12px",
                        fontWeight: j === 0 ? "700" : "400",
                        color: j === 0 ? "#8B1A1A" : "#111",
                        padding: "10px 12px 10px 0",
                        borderBottom: "1px solid rgba(17,17,17,0.05)",
                      }}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="font-sans mt-6" style={{ fontSize: "10px", color: "rgba(17,17,17,0.4)", lineHeight: 1.7 }}>
            All NAAMI garments are cut with ease — a relaxed silhouette is intentional.
            When between sizes, we recommend sizing down for a more tailored look.
          </p>
        </div>
      </div>
    </div>
  );
}
