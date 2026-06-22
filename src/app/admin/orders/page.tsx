"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";
import { Order, OrderStatus } from "@/models/orderStore";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   "#D97706",
  confirmed: "#2563EB",
  shipped:   "#7C3AED",
  delivered: "#16A34A",
  cancelled: "#DC2626",
};

const ALL_STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.14em", color: STATUS_COLORS[status], backgroundColor: STATUS_COLORS[status] + "18", padding: "3px 8px", display: "inline-block" }}>
      {status}
    </span>
  );
}

const fmtINR = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const load = () => {
    setIsLoading(true);
    const url = statusFilter !== "all" ? `/api/admin/orders?status=${statusFilter}` : "/api/admin/orders";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing) setNewStatus(editing.status);
  }, [editing]);

  const handleSubmit = async () => {
    if (!editing) return;
    setSubmitting(true);
    const res = await fetch(`/api/admin/orders/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    setSubmitting(false);
    if (res.ok) { setEditing(null); load(); } else {
      const d = await res.json(); setError(d.error ?? "Save failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-light uppercase" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>Orders</h1>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="font-sans font-bold uppercase"
          style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#111111", backgroundColor: "#EDE8DC", border: "1px solid rgba(17,17,17,0.12)", padding: "6px 12px", cursor: "pointer", outline: "none" }}
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}
      <CrudTable
        columns={[
          { key: "id", label: "Order ID" },
          { key: "customerName", label: "Customer" },
          { key: "items", label: "Items", render: (o) => String(o.items.length) },
          { key: "totalINR", label: "Total", render: (o) => <span className="font-serif" style={{ fontSize: "13px" }}>{fmtINR(o.totalINR)}</span> },
          { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
          { key: "createdAt", label: "Date", render: (o) => new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        ]}
        rows={rows}
        onEdit={(o) => setEditing(o)}
        isLoading={isLoading}
      />

      <CrudModal
        isOpen={!!editing}
        title={`Update Order — ${editing?.id}`}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        submitLabel="Update Status"
        submitting={submitting}
      >
        {editing && (
          <div>
            <div style={{ marginBottom: 16, padding: "14px 16px", backgroundColor: "#F4F0E6", borderLeft: "3px solid rgba(17,17,17,0.15)" }}>
              <p className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.5)", marginBottom: 6 }}>Customer</p>
              <p className="font-serif" style={{ fontSize: "1rem" }}>{editing.customerName}</p>
              <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}>{editing.customerEmail}</p>
            </div>
            <div style={{ marginBottom: 16, padding: "14px 16px", backgroundColor: "#F4F0E6", borderLeft: "3px solid rgba(17,17,17,0.15)" }}>
              <p className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.5)", marginBottom: 6 }}>Items</p>
              {editing.items.map((item, i) => (
                <p key={i} className="font-sans" style={{ fontSize: "11px", color: "#111111", marginBottom: 3 }}>
                  {item.quantity}× {item.name}{item.size ? ` (${item.size})` : ""} — {fmtINR(item.priceINR)}
                </p>
              ))}
              <p className="font-serif mt-3" style={{ fontSize: "1.1rem" }}>Total: {fmtINR(editing.totalINR)}</p>
            </div>
            <div style={{ marginBottom: 4 }}>
              <label className="block font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 8 }}>
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="font-sans"
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", backgroundColor: "#F4F0E6", border: "1px solid rgba(17,17,17,0.12)", color: "#111111", outline: "none" }}
              >
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
        )}
      </CrudModal>
    </div>
  );
}
