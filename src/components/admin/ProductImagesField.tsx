"use client";

import { useRef, useState } from "react";
import { labelCls, labelStyle } from "./formFields";

export interface ProductImageDraft {
  url: string;
  thumbnailUrl?: string | null;
  sizeBytes?: number;
}

interface ProductImagesFieldProps {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
}

export const MAX_PRODUCT_IMAGES = 6;

export function ProductImagesField({ images, onChange }: ProductImagesFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const dragIndex = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");

    const selected = Array.from(files);
    if (images.length + selected.length > MAX_PRODUCT_IMAGES) {
      setError(`A product can have at most ${MAX_PRODUCT_IMAGES} images (${images.length} already added).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const uploaded: ProductImageDraft[] = [];
    for (let i = 0; i < selected.length; i++) {
      setProgress(`Uploading ${i + 1} of ${selected.length}…`);
      const formData = new FormData();
      formData.append("file", selected[i]);
      formData.append("type", "product");
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Upload failed");
          break;
        }
        uploaded.push({ url: data.image, thumbnailUrl: data.thumbnailImage, sizeBytes: data.sizeBytes });
      } catch {
        setError("Upload failed");
        break;
      }
    }
    setUploading(false);
    setProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (uploaded.length > 0) onChange([...images, ...uploaded]);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    onChange(next);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label className={labelCls} style={labelStyle}>
        Images ({images.length}/{MAX_PRODUCT_IMAGES})
      </label>
      <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)", marginBottom: 10 }}>
        Deliver 1440 × 1920 (3:4 portrait). First image is the main image. Drag cards to reorder.
        Select multiple files at once to upload in order. Max 15MB each; auto-converted to WebP at up to 1920px.
      </p>

      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
          {images.map((img, index) => (
            <div
              key={img.url + index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              style={{
                border: "1px solid rgba(17,17,17,0.15)",
                backgroundColor: "#F4F0E6",
                padding: 6,
                cursor: "grab",
                position: "relative",
              }}
            >
              {index === 0 && (
                <span
                  className="font-sans font-bold uppercase"
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    fontSize: "7px",
                    letterSpacing: "0.1em",
                    color: "#F4F0E6",
                    backgroundColor: "#8B1A1A",
                    padding: "2px 5px",
                    zIndex: 1,
                  }}
                >
                  Main
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbnailUrl ?? img.url}
                alt={`Product image ${index + 1}`}
                style={{ width: "100%", height: 100, objectFit: "cover", marginBottom: 6 }}
              />
              <input
                readOnly
                value={img.url}
                style={{
                  width: "100%",
                  fontSize: "9px",
                  padding: "4px 6px",
                  backgroundColor: "#EDE8DC",
                  border: "1px solid rgba(17,17,17,0.1)",
                  color: "rgba(17,17,17,0.55)",
                  marginBottom: 6,
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="font-sans font-bold uppercase hover:opacity-60 transition-opacity"
                style={{
                  width: "100%",
                  fontSize: "8.5px",
                  letterSpacing: "0.1em",
                  color: "#8B1A1A",
                  border: "1px solid rgba(139,26,26,0.3)",
                  background: "none",
                  padding: "4px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploading || images.length >= MAX_PRODUCT_IMAGES}
        style={{ fontSize: "11px" }}
      />
      {uploading && (
        <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.55)", marginTop: 6 }}>
          {progress}
        </p>
      )}
      {error && (
        <p className="font-sans" style={{ fontSize: "10px", color: "#8B1A1A", marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
