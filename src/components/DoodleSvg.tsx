import { DOODLE_VIEWBOX, strokeToPathD, type DoodleStroke } from "@/lib/doodle";

interface DoodleSvgProps {
  strokes: DoodleStroke[];
  className?: string;
  /** Watermark treatment: soft overall opacity + vignette fade toward the edges. */
  faded?: boolean;
}

// Fixed ids are safe: only the footer renders a faded doodle, once per page.
const VIGNETTE_GRADIENT_ID = "doodle-vignette-gradient";
const VIGNETTE_MASK_ID = "doodle-vignette-mask";
const SPRAY_FILTER_ID = "doodle-spray-filter";

export default function DoodleSvg({ strokes, className, faded = false }: DoodleSvgProps) {
  return (
    <svg
      viewBox={`0 0 ${DOODLE_VIEWBOX.w} ${DOODLE_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      fill="none"
      className={className}
    >
      {faded && (
        <defs>
          <radialGradient id={VIGNETTE_GRADIENT_ID} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={VIGNETTE_MASK_ID}>
            <rect
              width={DOODLE_VIEWBOX.w}
              height={DOODLE_VIEWBOX.h}
              fill={`url(#${VIGNETTE_GRADIENT_ID})`}
            />
          </mask>
          {/* Fixed seed keeps this deterministic across server/client render. */}
          <filter id={SPRAY_FILTER_ID} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
          </filter>
        </defs>
      )}
      <g
        opacity={faded ? 0.65 : undefined}
        mask={faded ? `url(#${VIGNETTE_MASK_ID})` : undefined}
        filter={faded ? `url(#${SPRAY_FILTER_ID})` : undefined}
      >
        {strokes.map((s, i) => (
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
      </g>
    </svg>
  );
}
