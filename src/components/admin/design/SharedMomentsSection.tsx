"use client";

import { VideoUploadField } from "@/components/admin/VideoUploadField";
import {
  sectionLabelStyle, fieldLabelStyle, inputStyle,
  removeCardButtonStyle, addCardButtonStyle, SaveControl,
  type SharedMomentVideo,
} from "./shared";

interface HeaderProps {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  sharedMomentsError: string | null;
  sharedMomentsSaving: boolean;
  sharedMomentsSaved: boolean;
  onSave: () => void;
}

interface VideosProps {
  videos: SharedMomentVideo[];
  addVideo: () => void;
  updateVideo: (idx: number, patch: Partial<SharedMomentVideo>) => void;
  removeVideo: (idx: number) => void;
  videosError: string | null;
  videosSaving: boolean;
  videosSaved: boolean;
  onSaveVideos: () => void;
}

type Props = HeaderProps & VideosProps;

export function SharedMomentsSection({
  settings,
  update,
  sharedMomentsError,
  sharedMomentsSaving,
  sharedMomentsSaved,
  onSave,
  videos,
  addVideo,
  updateVideo,
  removeVideo,
  videosError,
  videosSaving,
  videosSaved,
  onSaveVideos,
}: Props) {
  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>
        Shared Moments
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
          Upload short clips to display in a scrapbook-style tape carousel on the homepage. Add as many as you
          like, drag the sort order to reorder them, and toggle the section on/off below.
        </p>

        <label className="font-sans font-bold uppercase tracking-[0.18em] flex items-center gap-2 cursor-pointer" style={{ fontSize: "9px", color: "#111" }}>
          <input
            type="checkbox"
            checked={settings.shared_moments_enabled === "true"}
            onChange={(e) => update("shared_moments_enabled", e.target.checked ? "true" : "false")}
            style={{ accentColor: "#8B1A1A" }}
          />
          Show this section on the homepage
        </label>

        <div>
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-4" style={sectionLabelStyle}>
            Section Header
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Kicker</label>
              <input value={settings.shared_moments_kicker ?? ""} onChange={(e) => update("shared_moments_kicker", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Title</label>
              <input value={settings.shared_moments_title ?? ""} onChange={(e) => update("shared_moments_title", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <SaveControl saving={sharedMomentsSaving} saved={sharedMomentsSaved} error={sharedMomentsError} onSave={onSave} label="Save Section Header" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginTop: "36px" }}>
        <p className="font-sans font-bold uppercase tracking-[0.22em]" style={sectionLabelStyle}>
          Videos
        </p>
        {videos.map((video, idx) => (
          <div key={video.id ?? `new-${idx}`} style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: "20px" }}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-sans font-bold uppercase tracking-[0.22em]" style={sectionLabelStyle}>
                Video {idx + 1}
              </p>
              <button type="button" style={removeCardButtonStyle} onClick={() => removeVideo(idx)}>
                Remove Video
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <VideoUploadField
                video={video.videoUrl}
                onUploaded={(videoUrl, thumbnailImage) => updateVideo(idx, { videoUrl, thumbnailImage })}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Caption</label>
                  <input value={video.caption} onChange={(e) => updateVideo(idx, { caption: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="font-sans font-bold uppercase tracking-[0.18em] block mb-1.5" style={fieldLabelStyle}>Sort Order</label>
                  <input type="number" value={video.sortOrder} onChange={(e) => updateVideo(idx, { sortOrder: Number(e.target.value) })} style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
        ))}
        <button type="button" style={addCardButtonStyle} onClick={addVideo}>
          + Add Video
        </button>
        <SaveControl saving={videosSaving} saved={videosSaved} error={videosError} onSave={onSaveVideos} label="Save Videos" />
      </div>
    </section>
  );
}
