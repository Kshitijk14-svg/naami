"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";
import { Product } from "@/models/productStore";

type FormData = {
  number: string;
  name: string;
  subtitle: string;
  priceINR: string;
  material: string;
  fit: string;
  origin: string;
  image: string;
  category: string;
  stock: string;
  sizes: string;
  isPublished: boolean;
};

const emptyForm: FormData = {
  number: "", name: "", subtitle: "", priceINR: "",
  material: "", fit: "", origin: "", image: "",
  category: "", stock: "10", sizes: "S,M,L,XL", isPublished: true,
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
        priceINR: String(editing.priceINR),
        material: editing.material,
        fit: editing.fit,
        origin: editing.origin,
        image: editing.image,
        category: editing.category ?? "",
        stock: String(editing.stock),
        sizes: (editing.sizes ?? []).join(","),
        isPublished: editing.isPublished,
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
          { key: "category", label: "Category", render: (p) => p.category ?? "—" },
          { key: "priceINR", label: "Price", render: (p) => fmtINR(p.priceINR) },
          { key: "stock", label: "Stock" },
          {
            key: "isPublished", label: "Published",
            render: (p) => (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: p.isPublished ? "#16A34A" : "#DC2626" }}>
                {p.isPublished ? "Yes" : "No"}
              </span>
            ),
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
        {field("Image path", <input style={inputStyle} value={form.image} onChange={set("image")} placeholder="/images/product-jacket.png" />)}
        {field("Sizes (comma-separated)", <input style={inputStyle} value={form.sizes} onChange={set("sizes")} placeholder="S,M,L,XL" />)}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <input
            type="checkbox"
            id="isPublished"
            checked={form.isPublished}
            onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            style={{ width: 14, height: 14, accentColor: "#8B1A1A" }}
          />
          <label htmlFor="isPublished" className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)" }}>
            Published
          </label>
        </div>
      </CrudModal>
    </div>
  );
}
