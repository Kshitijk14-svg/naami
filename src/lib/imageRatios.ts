// Standard banner ratios. Boxes use CSS aspect-ratio (like product/collection
// cards) so they scale with width and never crop a correctly sized upload.
export const BANNER_SPECS = {
  hero: { width: 1920, height: 1080 },
  hotspot: { width: 1920, height: 1080 },
  loom: { width: 1600, height: 2000 },
} as const;

export type BannerSlot = keyof typeof BANNER_SPECS;

export const bannerRatio = (slot: BannerSlot) =>
  BANNER_SPECS[slot].width / BANNER_SPECS[slot].height;
