"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";
import { Category } from "@/models/categoryStore";

type FormData = { name: string; slug: string; description: string };
const emptyForm: FormData = { name: "", slug: "", description: "" };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: "12px",
  backgroundColor: "#F4F0E6", border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111", outline: "none", fontFamily: "inherit",
};

function field(label: string, children: React.ReactNode) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="block font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) setForm({ name: editing.name, slug: editing.slug, description: editing.description ?? "" });
    else setForm(emptyForm);
  }, [editing]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: toSlug(name) }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) { setModalOpen(false); setEditing(null); load(); } else {
      const d = await res.json(); setError(d.error ?? "Save failed");
    }
  };

  const handleDelete = async (c: Category) => {
    await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>Categories</h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}
      <CrudTable
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Description", render: (c) => c.description ?? "—" },
          { key: "createdAt", label: "Created", render: (c) => new Date(c.createdAt).toLocaleDateString("en-IN") },
        ]}
        rows={rows}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        onEdit={(c) => { setEditing(c); setModalOpen(true); }}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
      <CrudModal isOpen={modalOpen} title={editing ? "Edit Category" : "New Category"} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={handleSubmit} submitting={submitting}>
        {field("Name *", <input style={inputStyle} value={form.name} onChange={handleNameChange} onBlur={(e) => setForm((f) => ({ ...f, slug: toSlug(e.target.value) }))} placeholder="Limited Edition" />)}
        {field("Slug *", <input style={inputStyle} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="limited-edition" />)}
        {field("Description", <input style={inputStyle} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />)}
      </CrudModal>
    </div>
  );
}
