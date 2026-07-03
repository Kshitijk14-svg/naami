"use client";

import { useEffect, useRef, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";
import { CrudModal } from "@/components/admin/CrudModal";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/lib/orderStatus";
import { formatIst } from "@/lib/istTime";

// Matches the orders DB row as serialized by /api/admin/orders.
interface Order {
  id: string;
  userId: number;
  status: OrderStatus;
  totalInr: number;
  discountInr: number;
  shippingName: string | null;
  shippingEmail: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  adminNotes: string | null;
  invoiceNumber: string | null;
  createdAt: string;
}

interface OrderItem {
  id: number;
  productName: string;
  unitPriceInr: number;
  quantity: number;
  size: string | null;
}

interface HistoryEntry {
  id: number;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy: string;
  note: string | null;
  createdAt: string;
}

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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: "12px",
  backgroundColor: "#F4F0E6", border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111", outline: "none", fontFamily: "inherit",
};

const labelCls = "block font-sans font-bold uppercase";
const labelStyle: React.CSSProperties = { fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.55)", marginBottom: 5 };

const blockStyle: React.CSSProperties = { marginBottom: 16, padding: "14px 16px", backgroundColor: "#F4F0E6", borderLeft: "3px solid rgba(17,17,17,0.15)" };

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [editing, setEditing] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invoiceState, setInvoiceState] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const load = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    fetch(`/api/admin/orders${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, [statusFilter, debouncedSearch, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const openOrder = (o: Order) => {
    setEditing(o);
    setNewStatus("");
    setNote("");
    setTrackingNumber(o.trackingNumber ?? "");
    setTrackingCarrier(o.trackingCarrier ?? "");
    setTrackingUrl(o.trackingUrl ?? "");
    setAdminNotes(o.adminNotes ?? "");
    setInvoiceState("idle");
    setItems(null);
    setHistory(null);
    fetch(`/api/admin/orders/${o.id}/items`).then((r) => r.json()).then(setItems).catch(() => setItems([]));
    fetch(`/api/admin/orders/${o.id}/history`).then((r) => r.json()).then(setHistory).catch(() => setHistory([]));
  };

  const handleSubmit = async () => {
    if (!editing) return;
    setSubmitting(true);
    setError("");
    const body: Record<string, unknown> = {
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      adminNotes,
    };
    if (newStatus) {
      body.status = newStatus;
      if (note.trim()) body.note = note.trim();
    }
    const res = await fetch(`/api/admin/orders/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) { setEditing(null); load(); } else {
      const d = await res.json();
      setError(d.error ?? "Save failed");
    }
  };

  const sendInvoice = async () => {
    if (!editing) return;
    setInvoiceState("sending");
    const res = await fetch(`/api/admin/orders/${editing.id}/send-invoice`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setInvoiceState("sent");
      setEditing((prev) => (prev ? { ...prev, invoiceNumber: d.invoiceNumber } : prev));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to queue invoice");
      setInvoiceState("idle");
    }
  };

  const allowedNext = editing ? ORDER_TRANSITIONS[editing.status] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-serif font-light uppercase" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>Orders</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID or email…"
            className="font-sans"
            style={{ fontSize: "11px", backgroundColor: "#EDE8DC", border: "1px solid rgba(17,17,17,0.12)", padding: "6px 12px", outline: "none", color: "#111", width: 210 }}
          />
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From (IST)"
            className="font-sans" style={{ fontSize: "11px", backgroundColor: "#EDE8DC", border: "1px solid rgba(17,17,17,0.12)", padding: "5px 8px", outline: "none", color: "#111" }} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To (IST)"
            className="font-sans" style={{ fontSize: "11px", backgroundColor: "#EDE8DC", border: "1px solid rgba(17,17,17,0.12)", padding: "5px 8px", outline: "none", color: "#111" }} />
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
      </div>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}
      <CrudTable
        columns={[
          { key: "id", label: "Order ID", render: (o) => <span className="font-mono" style={{ fontSize: "11px" }}>{o.id}</span> },
          { key: "shippingName", label: "Customer", render: (o) => (
            <span>
              {o.shippingName ?? "—"}
              {o.shippingEmail && <span className="block" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)" }}>{o.shippingEmail}</span>}
            </span>
          )},
          { key: "totalInr", label: "Total", render: (o) => (
            <span className="font-serif" style={{ fontSize: "13px" }}>
              {fmtINR(o.totalInr)}
              {o.discountInr > 0 && <span className="block font-sans" style={{ fontSize: "9px", color: "#2E6B3A" }}>−{fmtINR(o.discountInr)} coupon</span>}
            </span>
          )},
          { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
          { key: "trackingNumber", label: "Tracking", render: (o) => o.trackingNumber ? <span className="font-mono" style={{ fontSize: "10px" }}>{o.trackingNumber}</span> : "—" },
          { key: "invoiceNumber", label: "Invoice", render: (o) => o.invoiceNumber ? <span className="font-mono" style={{ fontSize: "10px" }}>{o.invoiceNumber}</span> : "—" },
          { key: "createdAt", label: "Date (IST)", render: (o) => formatIst(o.createdAt) },
        ]}
        rows={rows}
        onEdit={openOrder}
        isLoading={isLoading}
      />

      <CrudModal
        isOpen={!!editing}
        title={`Order — ${editing?.id}`}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        submitLabel={newStatus ? "Update Status" : "Save Details"}
        submitting={submitting}
      >
        {editing && (
          <div>
            {/* Customer */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Customer</p>
              <p className="font-serif" style={{ fontSize: "1rem" }}>{editing.shippingName ?? "—"}</p>
              <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}>{editing.shippingEmail ?? "—"}</p>
            </div>

            {/* Items */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Items</p>
              {items === null ? (
                <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.4)" }}>Loading…</p>
              ) : (
                <>
                  {items.map((item) => (
                    <p key={item.id} className="font-sans" style={{ fontSize: "11px", color: "#111111", marginBottom: 3 }}>
                      {item.quantity}× {item.productName}{item.size ? ` (${item.size})` : ""} — {fmtINR(item.unitPriceInr * item.quantity)}
                    </p>
                  ))}
                  {editing.discountInr > 0 && (
                    <p className="font-sans" style={{ fontSize: "11px", color: "#2E6B3A", marginTop: 6 }}>
                      Discount: −{fmtINR(editing.discountInr)}
                    </p>
                  )}
                  <p className="font-serif mt-2" style={{ fontSize: "1.1rem" }}>Total: {fmtINR(editing.totalInr)}</p>
                </>
              )}
            </div>

            {/* Status change */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Status — currently <StatusBadge status={editing.status} /></p>
              {allowedNext.length === 0 ? (
                <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.45)" }}>
                  This order is in a final state and cannot be changed.
                </p>
              ) : (
                <>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus | "")}
                    className="font-sans"
                    style={{ ...inputStyle, marginBottom: 10 }}
                  >
                    <option value="">— Keep current status —</option>
                    {allowedNext.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  {newStatus && (
                    <input
                      style={inputStyle}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note for the status log"
                    />
                  )}
                  {newStatus && (
                    <p className="font-sans mt-2" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)" }}>
                      The customer will be emailed about this change.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Tracking */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Shipment Tracking</p>
              <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 10 }}>
                <input style={inputStyle} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" />
                <input style={inputStyle} value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)} placeholder="Carrier (e.g. Delhivery)" />
              </div>
              <input style={inputStyle} value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="Tracking URL (optional)" />
              {newStatus === "shipped" && !trackingNumber && (
                <p className="font-sans mt-2" style={{ fontSize: "10px", color: "#D97706" }}>
                  Tip: add a tracking number so the shipped email includes it.
                </p>
              )}
            </div>

            {/* Admin notes */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Admin Notes (internal only)</p>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Fulfilment issues, customer requests…"
              />
            </div>

            {/* Invoice */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Invoice</p>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={sendInvoice}
                  disabled={invoiceState !== "idle" || !editing.shippingEmail}
                  className="font-sans font-bold uppercase hover:opacity-80 transition-opacity disabled:opacity-40"
                  style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#F4F0E6", backgroundColor: "#8B1A1A", padding: "8px 16px", cursor: "pointer", border: "none" }}
                >
                  {invoiceState === "sending" ? "Queuing…" : invoiceState === "sent" ? "Invoice Queued ✓" : "Send Invoice to Customer"}
                </button>
                <a
                  href={`/api/orders/${editing.id}/invoice`}
                  className="font-sans font-bold uppercase hover:opacity-60 transition-opacity"
                  style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#8B1A1A" }}
                >
                  Download PDF
                </a>
                {editing.invoiceNumber && (
                  <span className="font-mono" style={{ fontSize: "10px", color: "rgba(17,17,17,0.55)" }}>{editing.invoiceNumber}</span>
                )}
              </div>
              {!editing.shippingEmail && (
                <p className="font-sans mt-2" style={{ fontSize: "10px", color: "#D97706" }}>No customer email on this order.</p>
              )}
            </div>

            {/* Status timeline */}
            <div style={blockStyle}>
              <p className={labelCls} style={labelStyle}>Status History</p>
              {history === null ? (
                <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.4)" }}>Loading…</p>
              ) : history.length === 0 ? (
                <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.4)" }}>No status changes recorded yet.</p>
              ) : (
                <div>
                  {history.map((h) => (
                    <div key={h.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(17,17,17,0.05)" }}>
                      <p className="font-sans" style={{ fontSize: "11px", color: "#111" }}>
                        <StatusBadge status={h.fromStatus} /> <span style={{ margin: "0 6px" }}>→</span> <StatusBadge status={h.toStatus} />
                      </p>
                      <p className="font-sans mt-1" style={{ fontSize: "10px", color: "rgba(17,17,17,0.5)" }}>
                        {formatIst(h.createdAt)} · {h.changedBy}{h.note ? ` — "${h.note}"` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CrudModal>
    </div>
  );
}
