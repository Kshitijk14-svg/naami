import { getAllDesignSettings } from "./designSettings";
import { getPublishedSharedMomentVideos } from "./homepageContent";

export interface SharedMomentsItem {
  id: string;
  caption: string;
  videoUrl: string;
  thumbnailImage: string;
}

export interface SharedMomentsContent {
  enabled: boolean;
  kicker: string;
  title: string;
  items: SharedMomentsItem[];
}

export async function getSharedMomentsContent(): Promise<SharedMomentsContent> {
  const settings = await getAllDesignSettings();

  const enabled = settings.shared_moments_enabled === "true";
  const rows = enabled ? await getPublishedSharedMomentVideos() : [];
  const items: SharedMomentsItem[] = rows.map((row) => ({
    id: String(row.id),
    caption: row.caption,
    videoUrl: row.videoUrl,
    thumbnailImage: row.thumbnailImage,
  }));

  return {
    enabled: enabled && items.length > 0,
    kicker: settings.shared_moments_kicker,
    title: settings.shared_moments_title,
    items,
  };
}
