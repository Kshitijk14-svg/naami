import type { ReactNode } from "react";
import { TITLE_CLASS, TITLE_ACCENT_CLASS, TITLE_ACCENT_STYLE, titleStyle } from "@/lib/typography";

/**
 * The one section-heading treatment, matching "Seasonal Collection" on the home
 * page: a tracked-caps kicker, a bold Title-Case line, and an optional
 * uppercase accent line tucked directly under it.
 *
 * Pure (no hooks) so it renders in both server and client trees. Callers own
 * the outer spacing via `className`.
 */
export default function SectionTitle({
  as: Tag = "h2",
  kicker,
  title,
  accent,
  size = "clamp(2.5rem, 5vw, 4rem)",
  color = "#5B1C1C",
  align = "left",
  className = "",
}: {
  as?: "h1" | "h2";
  kicker?: ReactNode;
  title: ReactNode;
  accent?: ReactNode;
  size?: string;
  color?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={`${align === "center" ? "text-center" : ""} ${className}`.trim()}>
      {kicker != null && kicker !== "" && (
        <span
          className={`font-sans font-bold uppercase tracking-[0.3em] mb-3 block ${
            align === "center" ? "mx-auto" : ""
          }`.trim()}
          style={{ fontSize: "9px", color: "#5B1C1C" }}
        >
          {kicker}
        </span>
      )}
      <Tag className={TITLE_CLASS} style={titleStyle(size, color)}>
        {title}
        {accent != null && accent !== "" && (
          <>
            <br />
            <span className={TITLE_ACCENT_CLASS} style={{ ...TITLE_ACCENT_STYLE, color }}>
              {accent}
            </span>
          </>
        )}
      </Tag>
    </div>
  );
}
