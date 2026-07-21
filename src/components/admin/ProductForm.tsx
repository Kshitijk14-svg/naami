"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { field, checkboxRow, inputStyle, labelCls, labelStyle } from "./formFields";
import { SizeStockField, type SizeStockDraft } from "./SizeStockField";
import { MetafieldsField, type MetafieldDraft } from "./MetafieldsField";
import { ProductImagesField, type ProductImageDraft } from "./ProductImagesField";

interface Category {
  id: number;
  name: string;
}

interface ProductDetail {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  priceInr: number;
  compareAtPriceInr: number | null;
  categoryId: number | null;
  stock: number;
  trackStock: boolean;
  lowStockThreshold: number;
  isPublished: boolean;
  isFeaturedNewArrival: boolean;
  isFeaturedBestseller: boolean;
  homeSortOrder: number;
  sizes: SizeStockDraft[];
  metafields: MetafieldDraft[];
  images: ProductImageDraft[];
}

interface FormState {
  number: string;
  name: string;
  subtitle: string;
  priceINR: string;
  compareAtPriceINR: string;
  categoryId: string;
  stock: string;
  trackStock: boolean;
  lowStockThreshold: string;
  isPublished: boolean;
  isFeaturedNewArrival: boolean;
  isFeaturedBestseller: boolean;
  homeSortOrder: string;
  sizes: SizeStockDraft[];
  metafields: MetafieldDraft[];
  images: ProductImageDraft[];
}

const emptyForm: FormState = {
  number: "",
  name: "",
  subtitle: "",
  priceINR: "",
  compareAtPriceINR: "",
  categoryId: "",
  stock: "10",
  trackStock: true,
  lowStockThreshold: "5",
  isPublished: true,
  isFeaturedNewArrival: false,
  isFeaturedBestseller: false,
  homeSortOrder: "0",
  sizes: [
    { size: "S", stock: 0 },
    { size: "M", stock: 0 },
    { size: "L", stock: 0 },
    { size: "XL", stock: 0 },
  ],
  metafields: [],
  images: [],
};

export function ProductForm({ productId }: { productId?: number }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(!!productId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((p: ProductDetail) => {
        setForm({
          number: p.number,
          name: p.name,
          subtitle: p.subtitle,
          priceINR: String(p.priceInr),
          compareAtPriceINR: p.compareAtPriceInr != null ? String(p.compareAtPriceInr) : "",
          categoryId: p.categoryId != null ? String(p.categoryId) : "",
          stock: String(p.stock),
          trackStock: p.trackStock,
          lowStockThreshold: String(p.lowStockThreshold),
          isPublished: p.isPublished,
          isFeaturedNewArrival: p.isFeaturedNewArrival,
          isFeaturedBestseller: p.isFeaturedBestseller,
          homeSortOrder: String(p.homeSortOrder),
          sizes: p.sizes ?? [],
          metafields: p.metafields ?? [],
          images: p.images ?? [],
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load product");
        setLoading(false);
      });
  }, [productId]);

  const set = <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Once sizes exist, product-level stock is derived from them rather than
  // edited directly — the server recomputes this anyway (setProductSizes),
  // but sending the live total here keeps the low-stock-alert comparison
  // in updateProduct() accurate instead of comparing against a stale value.
  const sizesStockTotal = form.sizes.reduce((sum, s) => sum + s.stock, 0);
  const effectiveStock = form.sizes.length > 0 ? sizesStockTotal : Number(form.stock);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const body = {
      number: form.number,
      name: form.name,
      subtitle: form.subtitle,
      priceINR: Number(form.priceINR),
      compareAtPriceInr: form.compareAtPriceINR ? Number(form.compareAtPriceINR) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      stock: effectiveStock,
      trackStock: form.trackStock,
      lowStockThreshold: Number(form.lowStockThreshold),
      isPublished: form.isPublished,
      isFeaturedNewArrival: form.isFeaturedNewArrival,
      isFeaturedBestseller: form.isFeaturedBestseller,
      homeSortOrder: Number(form.homeSortOrder),
      sizes: form.sizes,
      metafields: form.metafields.filter((m) => m.name.trim().length > 0),
      images: form.images.map((img) => ({
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
        sizeBytes: img.sizeBytes,
      })),
    };

    const url = productId ? `/api/admin/products/${productId}` : "/api/admin/products";
    const method = productId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSubmitting(false);

    if (res.ok) {
      router.push("/admin/products");
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
        {productId ? "Edit Product" : "New Product"}
      </h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}

      <div style={{ maxWidth: 640 }}>
        <div className="grid grid-cols-2 gap-x-4">
          {field("Number", <input style={inputStyle} value={form.number} onChange={set("number")} placeholder="001" />)}
          {field("Category", (
            <select style={inputStyle} value={form.categoryId} onChange={set("categoryId")}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ))}
        </div>
        {field("Name *", <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="OXFORD STRIPE SHIRT" />)}
        {field("Subtitle", <input style={inputStyle} value={form.subtitle} onChange={set("subtitle")} placeholder="120s Egyptian Cotton" />)}
        {field("Price (INR) *", <input style={inputStyle} type="number" value={form.priceINR} onChange={set("priceINR")} placeholder="29900" />)}
        {field("Compare-at Price (INR)", (
          <>
            <input
              style={inputStyle}
              type="number"
              value={form.compareAtPriceINR}
              onChange={set("compareAtPriceINR")}
              placeholder="Optional — shown struck-through with a discount badge"
            />
            {form.compareAtPriceINR &&
              form.priceINR &&
              Number(form.compareAtPriceINR) <= Number(form.priceINR) && (
                <p className="font-sans" style={{ fontSize: "10px", color: "#8B1A1A", marginTop: 4 }}>
                  Compare-at price should be higher than the actual price to show a discount.
                </p>
              )}
          </>
        ))}

        <div style={{ marginBottom: 14, padding: "12px 14px", backgroundColor: "#EDE8DC", border: "1px solid rgba(17,17,17,0.08)" }}>
          <p className={labelCls} style={{ ...labelStyle, marginBottom: 10 }}>Stock Manager</p>
          {checkboxRow(
            "trackStockToggle",
            "Infinite stock — sell without tracking inventory",
            !form.trackStock,
            (checked) => setForm((f) => ({ ...f, trackStock: !checked }))
          )}
          <div className="grid grid-cols-2 gap-x-4">
            {field(form.sizes.length > 0 ? "Stock (auto-calculated from sizes below)" : "Stock", (
              <input
                style={{ ...inputStyle, opacity: form.trackStock ? 1 : 0.5 }}
                type="number"
                value={form.sizes.length > 0 ? sizesStockTotal : form.stock}
                onChange={set("stock")}
                disabled={!form.trackStock || form.sizes.length > 0}
              />
            ))}
            {field("Low Stock Alert Threshold", (
              <input
                style={{ ...inputStyle, opacity: form.trackStock ? 1 : 0.5 }}
                type="number"
                value={form.lowStockThreshold}
                onChange={set("lowStockThreshold")}
                disabled={!form.trackStock}
              />
            ))}
          </div>
        </div>

        <SizeStockField sizes={form.sizes} onChange={(sizes) => setForm((f) => ({ ...f, sizes }))} />
        <MetafieldsField metafields={form.metafields} onChange={(metafields) => setForm((f) => ({ ...f, metafields }))} />
        <ProductImagesField images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} />

        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <p className={labelCls} style={{ ...labelStyle, marginBottom: 8 }}>Homepage featuring</p>
          {checkboxRow("isPublished", "Published", form.isPublished, (v) => setForm((f) => ({ ...f, isPublished: v })))}
          {checkboxRow("isFeaturedNewArrival", "Featured: New Arrival", form.isFeaturedNewArrival, (v) => setForm((f) => ({ ...f, isFeaturedNewArrival: v })))}
          {checkboxRow("isFeaturedBestseller", "Featured: Bestseller", form.isFeaturedBestseller, (v) => setForm((f) => ({ ...f, isFeaturedBestseller: v })))}
        </div>
        {field("Homepage Sort Order", <input style={inputStyle} type="number" value={form.homeSortOrder} onChange={set("homeSortOrder")} placeholder="0" />)}

        <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
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
