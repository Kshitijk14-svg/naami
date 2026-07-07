"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrudTable } from "@/components/admin/CrudTable";

type Category = { id: number; name: string; slug: string; description: string | null; createdAt: string };

export default function CategoriesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => { setRows(d); setIsLoading(false); })
      .catch(() => { setError("Failed to load"); setIsLoading(false); });
  };
  useEffect(() => { load(); }, []);

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
        onAdd={() => router.push("/admin/categories/new")}
        onEdit={(c) => router.push(`/admin/categories/${c.id}/edit`)}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}
