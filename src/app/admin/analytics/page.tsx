"use client";

import { useEffect, useState } from "react";
import { Analytics, OrderStatus } from "@/models/orderStore";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   "#D97706",
  confirmed: "#2563EB",
  shipped:   "#7C3AED",
  delivered: "#16A34A",
  cancelled: "#DC2626",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="border"
      style={{
        backgroundColor: "#EDE8DC",
        borderColor: "rgba(17,17,17,0.06)",
        padding: "24px 28px",
        borderLeft: "3px solid #8B1A1A",
      }}
    >
      <p className="font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.2em", color: "rgba(17,17,17,0.5)", marginBottom: 8 }}>
        {label}
      </p>
      <p className="font-serif font-light" style={{ fontSize: "2rem", color: "#111111", lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className="font-sans font-bold uppercase"
      style={{
        fontSize: "8px",
        letterSpacing: "0.14em",
        color: STATUS_COLORS[status],
        backgroundColor: STATUS_COLORS[status] + "18",
        padding: "3px 8px",
        display: "inline-block",
      }}
    >
      {status}
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load analytics"));
  }, []);

  const fmtINR = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  if (error) {
    return <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{error}</p>;
  }

  if (!data) {
    return <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#8B1A1A" }} />;
  }

  const statuses: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

  return (
    <div>
      <h1
        className="font-serif font-light uppercase mb-10"
        style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}
      >
        Sales Analytics
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard label="Total Revenue" value={fmtINR(data.totalRevenue)} />
        <StatCard label="Pending Orders" value={data.orderCounts.pending} />
        <StatCard label="Shipped" value={data.orderCounts.shipped} />
        <StatCard label="Delivered" value={data.orderCounts.delivered} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order status breakdown */}
        <section>
          <h2 className="font-sans font-bold uppercase mb-4" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(17,17,17,0.5)" }}>
            Orders by Status
          </h2>
          <div style={{ backgroundColor: "#EDE8DC", borderLeft: "3px solid #8B1A1A" }}>
            {statuses.map((s) => (
              <div
                key={s}
                className="flex items-center justify-between"
                style={{ padding: "10px 16px", borderBottom: "1px solid rgba(17,17,17,0.05)" }}
              >
                <StatusBadge status={s} />
                <span className="font-serif" style={{ fontSize: "1.2rem", color: "#111111" }}>
                  {data.orderCounts[s]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Top products */}
        <section>
          <h2 className="font-sans font-bold uppercase mb-4" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(17,17,17,0.5)" }}>
            Top Products
          </h2>
          <div style={{ backgroundColor: "#EDE8DC", borderLeft: "3px solid #8B1A1A" }}>
            {data.topProducts.length === 0 ? (
              <p className="font-sans" style={{ padding: "16px", fontSize: "11px", color: "rgba(17,17,17,0.4)" }}>No order data yet</p>
            ) : data.topProducts.map((p, i) => (
              <div
                key={p.productId}
                className="flex items-center gap-3"
                style={{ padding: "10px 16px", borderBottom: "1px solid rgba(17,17,17,0.05)" }}
              >
                <span className="font-serif" style={{ fontSize: "0.85rem", color: "rgba(17,17,17,0.3)", minWidth: 20 }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-bold uppercase truncate" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#111111" }}>
                    {p.name}
                  </p>
                  <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.5)" }}>
                    {p.count} units · {fmtINR(p.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent orders */}
      <section className="mt-10">
        <h2 className="font-sans font-bold uppercase mb-4" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "rgba(17,17,17,0.5)" }}>
          Recent Orders
        </h2>
        <div style={{ backgroundColor: "#EDE8DC", borderLeft: "3px solid #8B1A1A", overflowX: "auto" }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Order ID", "Customer", "Total", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left font-sans font-bold uppercase" style={{ fontSize: "8.5px", letterSpacing: "0.18em", color: "rgba(17,17,17,0.5)", padding: "10px 16px", borderBottom: "1px solid rgba(17,17,17,0.07)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid rgba(17,17,17,0.05)" }}>
                  <td className="font-sans" style={{ padding: "11px 16px", fontSize: "11px", color: "#111111" }}>{o.id}</td>
                  <td className="font-sans" style={{ padding: "11px 16px", fontSize: "11px", color: "#111111" }}>{o.customerName}</td>
                  <td className="font-serif" style={{ padding: "11px 16px", fontSize: "13px", color: "#111111" }}>{fmtINR(o.totalINR)}</td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge status={o.status} /></td>
                  <td className="font-sans" style={{ padding: "11px 16px", fontSize: "10px", color: "rgba(17,17,17,0.5)" }}>
                    {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
