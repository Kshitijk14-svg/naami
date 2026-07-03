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

interface ImageUploadFieldProps {
  type: "product" | "collection" | "lookcard" | "banner";
  image: string;
  onUploaded: (image: string, thumbnailImage: string) => void;
  onImageChange: (image: string) => void;
}

export function ImageUploadField({ type, image, onUploaded, onImageChange }: ImageUploadFieldProps) {
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
    formData.append("type", type);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        onUploaded(data.image, data.thumbnailImage);
        setSizeInfo(`${Math.round(data.sizeBytes / 1024)}KB (thumbnail ${Math.round(data.thumbnailSizeBytes / 1024)}KB)`);
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
        Image
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="preview"
            style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid rgba(17,17,17,0.12)" }}
          />
        )}
        <div style={{ flex: 1 }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
            style={{ fontSize: "11px" }}
          />
          {uploading && (
            <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.55)", marginTop: 4 }}>
              Compressing & uploading...
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
      <input
        style={inputStyle}
        value={image}
        onChange={(e) => onImageChange(e.target.value)}
        placeholder="/images/product-jacket.png"
      />
    </div>
  );
}
