"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";

type Collection = {
  id: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
  isPublished: boolean;
  showOnHomepage: boolean;
  homeSortOrder: number;
  productIds: number[];
};

type FormData = {
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
  productIds: string;
  isPublished: boolean;
  showOnHomepage: boolean;
  homeSortOrder: string;
};

const emptyForm: FormData = {
  number: "", name: "", tag: "", description: "",
  image: "", productIds: "", isPublished: true,
  showOnHomepage: false, homeSortOrder: "0",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: "12px",
  backgroundColor: "#F4F0E6", border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111", outline: "none", fontFamily: "inherit",
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

export default function CollectionsPage() {
  const [rows, setRows] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/collections")
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({
        number: editing.number, name: editing.name, tag: editing.tag,
        description: editing.description, image: editing.image,
        productIds: editing.productIds.join(","), isPublished: editing.isPublished,
        showOnHomepage: editing.showOnHomepage, homeSortOrder: String(editing.homeSortOrder),
      });
    } else setForm(emptyForm);
  }, [editing]);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const body = {
      ...form,
      homeSortOrder: Number(form.homeSortOrder),
      productIds: form.productIds ? form.productIds.split(",").map((s) => Number(s.trim())).filter(Boolean) : [],
    };
    const url = editing ? `/api/admin/collections/${editing.id}` : "/api/admin/collections";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) { setModalOpen(false); setEditing(null); load(); } else {
      const d = await res.json(); setError(d.error ?? "Save failed");
    }
  };

  const handleDelete = async (c: Collection) => {
    await fetch(`/api/admin/collections/${c.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>Collections</h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}
      <CrudTable
        columns={[
          { key: "number", label: "#" },
          { key: "name", label: "Name" },
          { key: "tag", label: "Tag" },
          { key: "productIds", label: "Products", render: (c) => String(c.productIds.length) },
          { key: "isPublished", label: "Published", render: (c) => (
            <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: c.isPublished ? "#16A34A" : "#DC2626" }}>
              {c.isPublished ? "Yes" : "No"}
            </span>
          )},
          { key: "showOnHomepage", label: "Homepage", render: (c) => c.showOnHomepage ? (
            <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#8B1A1A" }}>★</span>
          ) : <span style={{ opacity: 0.2 }}>—</span> },
        ]}
        rows={rows}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        onEdit={(c) => { setEditing(c); setModalOpen(true); }}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
      <CrudModal isOpen={modalOpen} title={editing ? "Edit Collection" : "New Collection"} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={handleSubmit} submitting={submitting}>
        <div className="grid grid-cols-2 gap-x-4">
          {field("Number *", <input style={inputStyle} value={form.number} onChange={set("number")} placeholder="01" />)}
          {field("Tag", <input style={inputStyle} value={form.tag} onChange={set("tag")} placeholder="AW26 Collection" />)}
        </div>
        {field("Name *", <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="OXFORD WHITES" />)}
        {field("Description", <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.description} onChange={set("description")} />)}
        {field("Image path", <input style={inputStyle} value={form.image} onChange={set("image")} placeholder="/images/product-jacket.png" />)}
        {field("Product IDs (comma-separated)", <input style={inputStyle} value={form.productIds} onChange={set("productIds")} placeholder="1,6,11" />)}
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <p className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 8 }}>
            Visibility
          </p>
          {checkboxRow("colPub", "Published", form.isPublished, (v) => setForm((f) => ({ ...f, isPublished: v })))}
          {checkboxRow("colHomepage", "Show on Homepage", form.showOnHomepage, (v) => setForm((f) => ({ ...f, showOnHomepage: v })))}
        </div>
        {field("Homepage Sort Order", <input style={inputStyle} type="number" value={form.homeSortOrder} onChange={set("homeSortOrder")} placeholder="0" />)}
      </CrudModal>
    </div>
  );
}
