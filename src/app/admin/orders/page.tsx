"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CrudTable } from "@/components/admin/CrudTable";
import { type OrderStatus } from "@/lib/orderStatus";
import { formatIst } from "@/lib/istTime";

interface Order {
  id: string;
  userId: number;
  status: OrderStatus;
  totalInr: number;
  discountInr: number;
  shippingName: string | null;
  shippingEmail: string | null;
  trackingNumber: string | null;
  invoiceNumber: string | null;
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

export default function OrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
        onEdit={(o) => router.push(`/admin/orders/${o.id}`)}
        isLoading={isLoading}
      />
    </div>
  );
}
