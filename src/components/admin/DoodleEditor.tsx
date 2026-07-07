"use client";

import { useRef, useState } from "react";
import {
  DOODLE_COLORS,
  DOODLE_MAX_BYTES,
  DOODLE_MAX_POINTS,
  DOODLE_VIEWBOX,
  DOODLE_WIDTHS,
  parseDoodle,
  serializeDoodle,
  strokeToPathD,
  type DoodleStroke,
} from "@/lib/doodle";

interface DoodleEditorProps {
  value: string;
  onChange: (json: string) => void;
}

const toolLabelStyle: React.CSSProperties = {
  fontSize: "8px",
  color: "rgba(17,17,17,0.45)",
};

const toolButtonStyle: React.CSSProperties = {
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

export function DoodleEditor({ value, onChange }: DoodleEditorProps) {
  const [strokes, setStrokes] = useState<DoodleStroke[]>(
    () => parseDoodle(value)?.strokes ?? []
  );
  const [liveStroke, setLiveStroke] = useState<DoodleStroke | null>(null);
  const [color, setColor] = useState<string>("#8B1A1A");
  const [brushWidth, setBrushWidth] = useState<number>(6);
  const [tooComplex, setTooComplex] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const totalPoints = (list: DoodleStroke[]) =>
    list.reduce((sum, s) => sum + s.points.length, 0);

  const toViewBox = (e: React.PointerEvent): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = ((e.clientX - rect.left) / rect.width) * DOODLE_VIEWBOX.w;
    const y = ((e.clientY - rect.top) / rect.height) * DOODLE_VIEWBOX.h;
    return [
      Math.min(DOODLE_VIEWBOX.w, Math.max(0, x)),
      Math.min(DOODLE_VIEWBOX.h, Math.max(0, y)),
    ];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const point = toViewBox(e);
    if (!point) return;
    if (totalPoints(strokes) >= DOODLE_MAX_POINTS) {
      setTooComplex(true);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setTooComplex(false);
    setLiveStroke({ color, width: brushWidth, points: [point] });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!liveStroke) return;
    const point = toViewBox(e);
    if (!point) return;
    const [lx, ly] = liveStroke.points[liveStroke.points.length - 1];
    const dx = point[0] - lx;
    const dy = point[1] - ly;
    // Thin the data: only keep points ≥ 2 viewBox units apart.
    if (dx * dx + dy * dy < 4) return;
    if (totalPoints(strokes) + liveStroke.points.length >= DOODLE_MAX_POINTS) return;
    setLiveStroke({ ...liveStroke, points: [...liveStroke.points, point] });
  };

  const commitStroke = () => {
    if (!liveStroke) return;
    const next = [...strokes, liveStroke];
    setLiveStroke(null);
    const json = serializeDoodle(next);
    if (json.length > DOODLE_MAX_BYTES) {
      setTooComplex(true);
      return;
    }
    setStrokes(next);
    onChange(json);
  };

  const undo = () => {
    const next = strokes.slice(0, -1);
    setStrokes(next);
    setTooComplex(false);
    onChange(serializeDoodle(next));
  };

  const clear = () => {
    setStrokes([]);
    setLiveStroke(null);
    setTooComplex(false);
    onChange("");
  };

  const visible = liveStroke ? [...strokes, liveStroke] : strokes;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div
        className="aspect-[8/5] max-w-[560px] cursor-crosshair select-none"
        style={{
          backgroundColor: "#EDE8DC",
          border: "1px solid rgba(139,26,26,0.15)",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${DOODLE_VIEWBOX.w} ${DOODLE_VIEWBOX.h}`}
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          style={{ touchAction: "none", width: "100%", height: "100%", display: "block" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitStroke}
          onPointerCancel={commitStroke}
        >
          {visible.map((s, i) => (
            <path
              key={i}
              d={strokeToPathD(s.points)}
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </svg>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px" }}>
        <div>
          <p className="font-sans font-bold uppercase tracking-[0.18em] mb-1.5" style={toolLabelStyle}>
            Color
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {DOODLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                style={{
                  width: "24px",
                  height: "24px",
                  backgroundColor: c,
                  border: "none",
                  cursor: "pointer",
                  ...(color === c
                    ? { outline: "2px solid #8B1A1A", outlineOffset: "2px" }
                    : {}),
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="font-sans font-bold uppercase tracking-[0.18em] mb-1.5" style={toolLabelStyle}>
            Brush
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {DOODLE_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                aria-label={`Brush width ${w}`}
                onClick={() => setBrushWidth(w)}
                style={{
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "1px solid rgba(139,26,26,0.3)",
                  cursor: "pointer",
                  ...(brushWidth === w
                    ? { outline: "2px solid #8B1A1A", outlineOffset: "2px" }
                    : {}),
                }}
              >
                <span
                  style={{
                    width: `${w}px`,
                    height: `${w}px`,
                    borderRadius: "50%",
                    backgroundColor: "#111",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignSelf: "flex-end" }}>
          <button type="button" style={toolButtonStyle} onClick={undo} disabled={strokes.length === 0}>
            Undo
          </button>
          <button type="button" style={toolButtonStyle} onClick={clear} disabled={strokes.length === 0}>
            Clear
          </button>
        </div>
      </div>

      {tooComplex && (
        <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>
          Doodle too complex — the last stroke was dropped. Try Undo or Clear to simplify.
        </p>
      )}
    </div>
  );
}
