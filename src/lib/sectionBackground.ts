import type { CSSProperties } from "react";

export type SectionBackgroundFit = "cover" | "contain" | "tile";

export function sectionBackgroundStyle(
  image: string | undefined,
  fit: SectionBackgroundFit | undefined
): CSSProperties {
  if (!image) return {};
  return {
    backgroundImage: `url(${image})`,
    backgroundSize: fit === "tile" ? "auto" : fit === "contain" ? "contain" : "cover",
    backgroundPosition: "center",
    backgroundRepeat: fit === "tile" ? "repeat" : "no-repeat",
  };
}
