"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";
import { Coupon } from "@/models/couponStore";

type FormData = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
};

const emptyForm: FormData = {
  code: "", discountType: "percent", discountValue: "",
  minOrderValue: "", usageLimit: "", expiresAt: "", isActive: true,
};

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

const fmtINR = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/coupons")
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        discountType: editing.discountType,
        discountValue: String(editing.discountValue),
        minOrderValue: editing.minOrderValue != null ? String(editing.minOrderValue) : "",
        usageLimit: editing.usageLimit != null ? String(editing.usageLimit) : "",
        expiresAt: editing.expiresAt ? new Date(editing.expiresAt).toISOString().slice(0, 10) : "",
        isActive: editing.isActive,
      });
    } else setForm(emptyForm);
  }, [editing]);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const body = {
      code: form.code.toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
      isActive: form.isActive,
    };
    const url = editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.ok) { setModalOpen(false); setEditing(null); load(); } else {
      const d = await res.json(); setError(d.error ?? "Save failed");
    }
  };

  const handleDelete = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>Coupons</h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}
      <CrudTable
        columns={[
          { key: "code", label: "Code", render: (c) => <span className="font-mono" style={{ fontSize: "11px", letterSpacing: "0.1em" }}>{c.code}</span> },
          { key: "discountType", label: "Type" },
          { key: "discountValue", label: "Value", render: (c) => c.discountType === "percent" ? `${c.discountValue}%` : fmtINR(c.discountValue) },
          { key: "minOrderValue", label: "Min Order", render: (c) => c.minOrderValue ? fmtINR(c.minOrderValue) : "—" },
          { key: "usageLimit", label: "Limit", render: (c) => c.usageLimit != null ? `${c.usedCount}/${c.usageLimit}` : `${c.usedCount}/∞` },
          { key: "expiresAt", label: "Expires", render: (c) => c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—" },
          { key: "isActive", label: "Active", render: (c) => (
            <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: c.isActive ? "#16A34A" : "#DC2626" }}>
              {c.isActive ? "Yes" : "No"}
            </span>
          )},
        ]}
        rows={rows}
        onAdd={() => { setEditing(null); setModalOpen(true); }}
        onEdit={(c) => { setEditing(c); setModalOpen(true); }}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
      <CrudModal isOpen={modalOpen} title={editing ? "Edit Coupon" : "New Coupon"} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={handleSubmit} submitting={submitting}>
        {field("Code *", <input style={inputStyle} value={form.code} onChange={set("code")} onBlur={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" />)}
        <div style={{ marginBottom: 14 }}>
          <p className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 8 }}>Discount Type *</p>
          <div className="flex gap-6">
            {(["percent", "fixed"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 font-sans font-bold uppercase cursor-pointer" style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#111111" }}>
                <input type="radio" value={t} checked={form.discountType === t} onChange={() => setForm((f) => ({ ...f, discountType: t }))} style={{ accentColor: "#8B1A1A" }} />
                {t === "percent" ? "Percent (%)" : "Fixed (₹)"}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          {field("Value *", <input style={inputStyle} type="number" value={form.discountValue} onChange={set("discountValue")} placeholder={form.discountType === "percent" ? "10" : "500"} />)}
          {field("Min Order Value", <input style={inputStyle} type="number" value={form.minOrderValue} onChange={set("minOrderValue")} placeholder="Optional" />)}
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          {field("Usage Limit", <input style={inputStyle} type="number" value={form.usageLimit} onChange={set("usageLimit")} placeholder="Optional" />)}
          {field("Expires On", <input style={inputStyle} type="date" value={form.expiresAt} onChange={set("expiresAt")} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <input type="checkbox" id="couponActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} style={{ width: 14, height: 14, accentColor: "#8B1A1A" }} />
          <label htmlFor="couponActive" className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)" }}>Active</label>
        </div>
      </CrudModal>
    </div>
  );
}
