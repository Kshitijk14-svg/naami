export const DOODLE_VIEWBOX = { w: 400, h: 250 } as const; // 8:5

export const DOODLE_COLORS = [
  "#5B1C1C",
  "#1A1212",
  "#2E6B3A",
  "#1F3A5F",
  "#B8752C",
  "#7A4E8C",
  "#C24A4A",
  "#5E5240",
] as const;

export const DOODLE_WIDTHS = [3, 6, 10] as const; // Fine / Medium / Bold

export const DOODLE_MAX_STROKES = 400;
export const DOODLE_MAX_POINTS = 8000;
export const DOODLE_MAX_BYTES = 200_000;

export interface DoodleStroke {
  color: string;
  width: number;
  points: [number, number][];
}

export interface DoodleData {
  version: 1;
  strokes: DoodleStroke[];
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function parseDoodle(raw: string): DoodleData | null {
  if (typeof raw !== "string" || raw === "" || raw.length > DOODLE_MAX_BYTES) {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const { version, strokes } = data as { version?: unknown; strokes?: unknown };
  if (version !== 1 || !Array.isArray(strokes)) return null;
  if (strokes.length === 0 || strokes.length > DOODLE_MAX_STROKES) return null;

  let totalPoints = 0;
  const parsed: DoodleStroke[] = [];
  for (const s of strokes) {
    if (typeof s !== "object" || s === null) return null;
    const { color, width, points } = s as {
      color?: unknown;
      width?: unknown;
      points?: unknown;
    };
    if (typeof color !== "string" || !HEX_COLOR_RE.test(color)) return null;
    if (typeof width !== "number" || !Number.isFinite(width)) return null;
    if (!Array.isArray(points) || points.length === 0) return null;
    totalPoints += points.length;
    if (totalPoints > DOODLE_MAX_POINTS) return null;
    const parsedPoints: [number, number][] = [];
    for (const p of points) {
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        typeof p[0] !== "number" ||
        typeof p[1] !== "number" ||
        !Number.isFinite(p[0]) ||
        !Number.isFinite(p[1])
      ) {
        return null;
      }
      parsedPoints.push([p[0], p[1]]);
    }
    parsed.push({
      color,
      width: Math.min(20, Math.max(1, width)),
      points: parsedPoints,
    });
  }
  return { version: 1, strokes: parsed };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function serializeDoodle(strokes: DoodleStroke[]): string {
  if (strokes.length === 0) return "";
  const data: DoodleData = {
    version: 1,
    strokes: strokes.map((s) => ({
      color: s.color,
      width: s.width,
      points: s.points.map(([x, y]) => [round1(x), round1(y)] as [number, number]),
    })),
  };
  return JSON.stringify(data);
}

export function strokeToPathD(points: [number, number][]): string {
  if (points.length === 0) return "";
  const [x0, y0] = points[0];
  if (points.length === 1) {
    // A tap renders as a dot thanks to the round linecap.
    return `M ${x0} ${y0} l 0.01 0`;
  }
  let d = `M ${x0} ${y0}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q ${cx} ${cy} ${round1((cx + nx) / 2)} ${round1((cy + ny) / 2)}`;
  }
  const [lx, ly] = points[points.length - 1];
  d += ` L ${lx} ${ly}`;
  return d;
}
