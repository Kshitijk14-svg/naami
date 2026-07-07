"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { field, inputStyle } from "./formFields";

interface CategoryDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
}

const emptyForm: FormState = { name: "", slug: "", description: "" };

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function CategoryForm({ categoryId }: { categoryId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(!!categoryId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    fetch(`/api/admin/categories/${categoryId}`)
      .then((r) => r.json())
      .then((c: CategoryDetail) => {
        setForm({ name: c.name, slug: c.slug, description: c.description ?? "" });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load category");
        setLoading(false);
      });
  }, [categoryId]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: toSlug(name) }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const url = categoryId ? `/api/admin/categories/${categoryId}` : "/api/admin/categories";
    const method = categoryId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) {
      router.push("/admin/categories");
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
        {categoryId ? "Edit Category" : "New Category"}
      </h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}

      <div style={{ maxWidth: 480 }}>
        {field("Name *", <input style={inputStyle} value={form.name} onChange={handleNameChange} onBlur={(e) => setForm((f) => ({ ...f, slug: toSlug(e.target.value) }))} placeholder="Limited Edition" />)}
        {field("Slug *", <input style={inputStyle} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="limited-edition" />)}
        {field("Description", <input style={inputStyle} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />)}

        <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
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
