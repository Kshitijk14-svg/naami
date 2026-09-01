"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "12px",
  backgroundColor: "#F4F0E6",
  border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111",
  outline: "none",
  fontFamily: "inherit",
};

interface VideoUploadFieldProps {
  video: string;
  onUploaded: (video: string, thumbnailImage: string) => void;
  label?: string;
  hint?: string;
  allowClear?: boolean;
  onClear?: () => void;
  /** Which feature is uploading — controls the storage subdir and whether the
   *  clip is re-encoded server-side. Defaults to the Shared Moments behaviour. */
  uploadType?: "moments" | "products";
}

export function VideoUploadField({ video, onUploaded, label = "Video", hint, allowClear, onClear, uploadType }: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sizeInfo, setSizeInfo] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setSizeInfo("");

    const formData = new FormData();
    formData.append("file", file);
    if (uploadType) formData.append("type", uploadType);

    try {
      const res = await fetch("/api/admin/upload-video", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        onUploaded(data.video, data.thumbnailImage);
        setSizeInfo(`${Math.round(data.sizeBytes / (1024 * 1024))}MB, ${Math.round(data.durationSeconds)}s`);
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label className="block font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 5 }}>
        {label}
      </label>
      {hint && (
        <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.55)", marginBottom: 6, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
        {video && (
          <div>
            <video
              src={video}
              muted
              controls
              style={{ width: 100, height: 100, objectFit: "cover", border: "1px solid rgba(17,17,17,0.12)" }}
            />
            {allowClear && (
              <button
                type="button"
                onClick={onClear}
                className="font-sans"
                style={{ fontSize: "9.5px", color: "#8B1A1A", marginTop: 4, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
              >
                Remove video
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
            style={{ fontSize: "11px" }}
          />
          <p className="font-sans" style={{ fontSize: "9.5px", color: "rgba(17,17,17,0.4)", marginTop: 4 }}>
            Max 60MB, up to 60 seconds. A thumbnail is generated automatically.
          </p>
          {uploading && (
            <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.55)", marginTop: 4 }}>
              Validating &amp; uploading...
            </p>
          )}
          {sizeInfo && (
            <p className="font-sans" style={{ fontSize: "10px", color: "#16A34A", marginTop: 4 }}>
              Uploaded — {sizeInfo}
            </p>
          )}
          {error && (
            <p className="font-sans" style={{ fontSize: "10px", color: "#8B1A1A", marginTop: 4 }}>
              {error}
            </p>
          )}
        </div>
      </div>
      {video && (
        <input
          style={{ ...inputStyle, color: "rgba(17,17,17,0.55)" }}
          value={video}
          readOnly
        />
      )}
    </div>
  );
}
