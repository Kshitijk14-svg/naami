"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrudTable } from "@/components/admin/CrudTable";

type Collection = {
  id: number;
  number: string;
  name: string;
  tag: string;
  isPublished: boolean;
  showOnHomepage: boolean;
  productIds: number[];
};

export default function CollectionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/collections")
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, []);

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
        onAdd={() => router.push("/admin/collections/new")}
        onEdit={(c) => router.push(`/admin/collections/${c.id}/edit`)}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}
