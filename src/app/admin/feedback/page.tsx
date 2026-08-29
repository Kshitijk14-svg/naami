"use client";

import { useEffect, useState } from "react";
import { CrudTable } from "@/components/admin/CrudTable";

type Feedback = {
  id: number;
  userId: number | null;
  orderId: string | null;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#8B1A1A", letterSpacing: "1px" }}>
      {"★".repeat(rating)}
      <span style={{ color: "rgba(17,17,17,0.2)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function FeedbackPage() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const toggleApproval = async (row: Feedback) => {
    // Optimistic: flip this one row locally instead of waiting on the round
    // trip and then re-fetching the entire feedback list for a single
    // boolean change. Revert just this row if the request actually fails.
    const nextApproved = !row.isApproved;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isApproved: nextApproved } : r)));

    const res = await fetch(`/api/admin/feedback/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: nextApproved }),
    });
    if (!res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isApproved: row.isApproved } : r)));
      setError("Failed to update approval");
    }
  };

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>
        Brand Feedback
      </h1>
      {error && <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>}
      <CrudTable
        columns={[
          { key: "rating", label: "Rating", render: (f) => <Stars rating={f.rating} /> },
          { key: "comment", label: "Comment", render: (f) => f.comment ?? "—" },
          { key: "orderId", label: "Order", render: (f) => f.orderId ?? "—" },
          { key: "createdAt", label: "Date", render: (f) => new Date(f.createdAt).toLocaleDateString("en-IN") },
          {
            key: "isApproved",
            label: "Approved",
            render: (f) => (
              <button
                onClick={() => toggleApproval(f)}
                className="font-sans font-bold uppercase hover:opacity-70 transition-opacity"
                style={{
                  fontSize: "8.5px",
                  letterSpacing: "0.14em",
                  padding: "5px 12px",
                  cursor: "pointer",
                  border: f.isApproved ? "1px solid #2E6B3A" : "1px solid rgba(139,26,26,0.3)",
                  color: f.isApproved ? "#2E6B3A" : "#8B1A1A",
                  background: "none",
                }}
              >
                {f.isApproved ? "Approved" : "Approve"}
              </button>
            ),
          },
        ]}
        rows={rows}
        isLoading={isLoading}
      />
    </div>
  );
}
