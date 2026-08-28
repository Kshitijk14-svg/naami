/**
 * Shared type scale for headings and product type.
 *
 * All body and heading copy is Glacial Indifference (400/700). Both `font-sans`
 * and `font-serif` resolve to it -- `font-serif` is kept only as an alias so the
 * many existing call sites keep working (see globals.css).
 *
 * August Bold is exposed separately as `font-wordmark` and is used *only* for
 * the brand name, always lowercase. It ships bold-only and has no italic, so
 * pair it with `font-bold` rather than `font-semibold`/`font-light`, which the
 * browser would have to synthesise.
 */

/** Base title line — bold, never uppercase, never italic. */
export const TITLE_CLASS = "font-sans font-bold";

/** Accent line of a two-part title — smaller, regular weight, tracked-out caps. */
export const TITLE_ACCENT_CLASS = "font-sans font-normal uppercase";
export const TITLE_ACCENT_STYLE = {
  color: "#5B1C1C",
  fontSize: "0.32em",
  letterSpacing: "0.35em",
  position: "relative",
  top: "-1.12em",
} as const;

/** Title metrics. Pass `color` only for headings on dark or photographic backgrounds. */
export function titleStyle(fontSize: string, color = "#1A1212") {
  return { fontSize, color, lineHeight: 1.05, letterSpacing: "0.02em" } as const;
}

/** Product and collection names. */
export const PRODUCT_NAME_CLASS = "font-sans font-light uppercase";

/** Prices. */
export const PRICE_CLASS = "font-sans font-light";
