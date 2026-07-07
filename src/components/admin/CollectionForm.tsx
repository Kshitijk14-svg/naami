"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { field, checkboxRow, inputStyle, labelCls, labelStyle } from "./formFields";
import { ImageUploadField } from "./ImageUploadField";

interface CollectionDetail {
  id: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
  thumbnailImage?: string;
  isPublished: boolean;
  showOnHomepage: boolean;
  homeSortOrder: number;
  productIds: number[];
}

interface FormState {
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
  thumbnailImage: string;
  productIds: string;
  isPublished: boolean;
  showOnHomepage: boolean;
  homeSortOrder: string;
}

const emptyForm: FormState = {
  number: "",
  name: "",
  tag: "",
  description: "",
  image: "",
  thumbnailImage: "",
  productIds: "",
  isPublished: true,
  showOnHomepage: false,
  homeSortOrder: "0",
};

export function CollectionForm({ collectionId }: { collectionId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(!!collectionId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!collectionId) return;
    setLoading(true);
    fetch(`/api/admin/collections/${collectionId}`)
      .then((r) => r.json())
      .then((c: CollectionDetail) => {
        setForm({
          number: c.number,
          name: c.name,
          tag: c.tag,
          description: c.description,
          image: c.image,
          thumbnailImage: c.thumbnailImage ?? "",
          productIds: c.productIds.join(","),
          isPublished: c.isPublished,
          showOnHomepage: c.showOnHomepage,
          homeSortOrder: String(c.homeSortOrder),
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load collection");
        setLoading(false);
      });
  }, [collectionId]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const body = {
      ...form,
      homeSortOrder: Number(form.homeSortOrder),
      productIds: form.productIds ? form.productIds.split(",").map((s) => Number(s.trim())).filter(Boolean) : [],
    };
    const url = collectionId ? `/api/admin/collections/${collectionId}` : "/api/admin/collections";
    const method = collectionId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) {
      router.push("/admin/collections");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
    }
  };

  if (loading) {
    return <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)" }}>Loading…</p>;
  }

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>
        {collectionId ? "Edit Collection" : "New Collection"}
      </h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}

      <div style={{ maxWidth: 560 }}>
        <div className="grid grid-cols-2 gap-x-4">
          {field("Number *", <input style={inputStyle} value={form.number} onChange={set("number")} placeholder="01" />)}
          {field("Tag", <input style={inputStyle} value={form.tag} onChange={set("tag")} placeholder="AW26 Collection" />)}
        </div>
        {field("Name *", <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="OXFORD WHITES" />)}
        {field("Description", <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.description} onChange={set("description")} />)}
        <ImageUploadField
          type="collection"
          image={form.image}
          onUploaded={(image, thumbnailImage) => setForm((f) => ({ ...f, image, thumbnailImage }))}
        />
        {field("Product IDs (comma-separated)", <input style={inputStyle} value={form.productIds} onChange={set("productIds")} placeholder="1,6,11" />)}
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <p className={labelCls} style={{ ...labelStyle, marginBottom: 8 }}>Visibility</p>
          {checkboxRow("colPub", "Published", form.isPublished, (v) => setForm((f) => ({ ...f, isPublished: v })))}
          {checkboxRow("colHomepage", "Show on Homepage", form.showOnHomepage, (v) => setForm((f) => ({ ...f, showOnHomepage: v })))}
        </div>
        {field("Homepage Sort Order", <input style={inputStyle} type="number" value={form.homeSortOrder} onChange={set("homeSortOrder")} placeholder="0" />)}

        <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => router.push("/admin/collections")}
            className="font-sans font-bold uppercase hover:opacity-60 transition-opacity"
            style={{ fontSize: "9px", letterSpacing: "0.18em", color: "#111111", cursor: "pointer", padding: "8px 16px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="font-sans font-bold uppercase hover:opacity-80 transition-opacity disabled:opacity-40"
            style={{ fontSize: "9px", letterSpacing: "0.18em", color: "#F4F0E6", backgroundColor: "#8B1A1A", padding: "8px 20px", cursor: "pointer" }}
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
