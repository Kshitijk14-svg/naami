"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

type Product = {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  priceInr: number;
  material: string;
  fit: string;
  origin: string;
  image: string;
  thumbnailImage?: string;
  stock: number;
  isPublished: boolean;
  isFeaturedNewArrival: boolean;
  isFeaturedBestseller: boolean;
  homeSortOrder: number;
  sizes?: string[];
  category?: string;
};

type FormData = {
  number: string;
  name: string;
  subtitle: string;
  priceINR: string;
  material: string;
  fit: string;
  origin: string;
  image: string;
  thumbnailImage: string;
  category: string;
  stock: string;
  sizes: string;
  isPublished: boolean;
  isFeaturedNewArrival: boolean;
  isFeaturedBestseller: boolean;
  homeSortOrder: string;
};

const emptyForm: FormData = {
  number: "", name: "", subtitle: "", priceINR: "",
  material: "", fit: "", origin: "", image: "", thumbnailImage: "",
  category: "", stock: "10", sizes: "S,M,L,XL", isPublished: true,
  isFeaturedNewArrival: false, isFeaturedBestseller: false, homeSortOrder: "0",
};

function field(label: string, children: React.ReactNode) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="block font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

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

const checkboxRow = (
  id: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void
) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 14, height: 14, accentColor: "#8B1A1A" }}
    />
    <label htmlFor={id} className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)" }}>
      {label}
    </label>
  </div>
);

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => { setProducts(data); setIsLoading(false); })
      .catch(() => { setError("Failed to load products"); setIsLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({
        number: editing.number,
        name: editing.name,
        subtitle: editing.subtitle,
        priceINR: String(editing.priceInr),
        material: editing.material,
        fit: editing.fit,
        origin: editing.origin,
        image: editing.image,
        thumbnailImage: editing.thumbnailImage ?? "",
        category: editing.category ?? "",
        stock: String(editing.stock),
        sizes: (editing.sizes ?? []).join(","),
        isPublished: editing.isPublished,
        isFeaturedNewArrival: editing.isFeaturedNewArrival,
        isFeaturedBestseller: editing.isFeaturedBestseller,
        homeSortOrder: String(editing.homeSortOrder),
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const body = {
      ...form,
      priceINR: Number(form.priceINR),
      stock: Number(form.stock),
      homeSortOrder: Number(form.homeSortOrder),
      sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };

    const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSubmitting(false);

    if (res.ok) { closeModal(); load(); } else {
      const d = await res.json();
      setError(d.error ?? "Save failed");
    }
  };

  const handleDelete = async (p: Product) => {
    await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
    load();
  };

  const fmtINR = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>
        Products
      </h1>
      {error && (
        <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>
      )}
      <CrudTable
        columns={[
          { key: "number", label: "#" },
          { key: "name", label: "Name" },
          { key: "priceInr", label: "Price", render: (p) => fmtINR(p.priceInr) },
          { key: "stock", label: "Stock" },
          {
            key: "isPublished", label: "Published",
            render: (p) => (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: p.isPublished ? "#16A34A" : "#DC2626" }}>
                {p.isPublished ? "Yes" : "No"}
              </span>
            ),
          },
          {
            key: "isFeaturedNewArrival", label: "New Arrival",
            render: (p) => p.isFeaturedNewArrival ? (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#8B1A1A" }}>★</span>
            ) : <span style={{ opacity: 0.2 }}>—</span>,
          },
          {
            key: "isFeaturedBestseller", label: "Bestseller",
            render: (p) => p.isFeaturedBestseller ? (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#8B1A1A" }}>★</span>
            ) : <span style={{ opacity: 0.2 }}>—</span>,
          },
        ]}
        rows={products}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <CrudModal
        isOpen={modalOpen}
        title={editing ? "Edit Product" : "New Product"}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        <div className="grid grid-cols-2 gap-x-4">
          {field("Number", <input style={inputStyle} value={form.number} onChange={set("number")} placeholder="001" />)}
          {field("Stock", <input style={inputStyle} type="number" value={form.stock} onChange={set("stock")} />)}
        </div>
        {field("Name *", <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="OXFORD STRIPE SHIRT" />)}
        {field("Subtitle", <input style={inputStyle} value={form.subtitle} onChange={set("subtitle")} placeholder="120s Egyptian Cotton" />)}
        <div className="grid grid-cols-2 gap-x-4">
          {field("Price (INR) *", <input style={inputStyle} type="number" value={form.priceINR} onChange={set("priceINR")} placeholder="29900" />)}
          {field("Category", <input style={inputStyle} value={form.category} onChange={set("category")} placeholder="Shirts" />)}
        </div>
        {field("Material", <input style={inputStyle} value={form.material} onChange={set("material")} />)}
        {field("Fit", <input style={inputStyle} value={form.fit} onChange={set("fit")} />)}
        {field("Origin", <input style={inputStyle} value={form.origin} onChange={set("origin")} />)}
        <ImageUploadField
          type="product"
          image={form.image}
          onImageChange={(image) => setForm((f) => ({ ...f, image }))}
          onUploaded={(image, thumbnailImage) => setForm((f) => ({ ...f, image, thumbnailImage }))}
        />
        {field("Sizes (comma-separated)", <input style={inputStyle} value={form.sizes} onChange={set("sizes")} placeholder="S,M,L,XL" />)}
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <p className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 8 }}>
            Homepage featuring
          </p>
          {checkboxRow("isPublished", "Published", form.isPublished, (v) => setForm((f) => ({ ...f, isPublished: v })))}
          {checkboxRow("isFeaturedNewArrival", "Featured: New Arrival", form.isFeaturedNewArrival, (v) => setForm((f) => ({ ...f, isFeaturedNewArrival: v })))}
          {checkboxRow("isFeaturedBestseller", "Featured: Bestseller", form.isFeaturedBestseller, (v) => setForm((f) => ({ ...f, isFeaturedBestseller: v })))}
        </div>
        {field("Homepage Sort Order", <input style={inputStyle} type="number" value={form.homeSortOrder} onChange={set("homeSortOrder")} placeholder="0" />)}
      </CrudModal>
    </div>
  );
}
