"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrudTable } from "@/components/admin/CrudTable";

type Product = {
  id: number;
  number: string;
  name: string;
  priceInr: number;
  stock: number;
  trackStock: boolean;
  isPublished: boolean;
  isFeaturedNewArrival: boolean;
  isFeaturedBestseller: boolean;
  categoryId: number | null;
};

type Category = {
  id: number;
  name: string;
};

const fmtINR = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setIsLoading(true);
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => { setProducts(data); setIsLoading(false); })
      .catch(() => { setError("Failed to load products"); setIsLoading(false); });
  };

  useEffect(() => {
    load();
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  const handleDelete = async (p: Product) => {
    await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h1 className="font-serif font-light uppercase mb-8" style={{ fontSize: "1.8rem", color: "#111111", letterSpacing: "0.02em" }}>
        Products
      </h1>
      {error && (
        <p className="font-sans mb-4" style={{ fontSize: "11px", color: "#8B1A1A" }}>{error}</p>
      )}
      <CrudTable
        columns={[
          { key: "number", label: "#" },
          { key: "name", label: "Name" },
          { key: "priceInr", label: "Price", render: (p) => fmtINR(p.priceInr) },
          {
            key: "category", label: "Category",
            render: (p) => categories.find((c) => c.id === p.categoryId)?.name ?? "—",
          },
          { key: "stock", label: "Stock", render: (p) => (p.trackStock ? p.stock : "∞") },
          {
            key: "isPublished", label: "Published",
            render: (p) => (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: p.isPublished ? "#16A34A" : "#DC2626" }}>
                {p.isPublished ? "Yes" : "No"}
              </span>
            ),
          },
          {
            key: "isFeaturedNewArrival", label: "New Arrival",
            render: (p) => p.isFeaturedNewArrival ? (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#8B1A1A" }}>★</span>
            ) : <span style={{ opacity: 0.2 }}>—</span>,
          },
          {
            key: "isFeaturedBestseller", label: "Bestseller",
            render: (p) => p.isFeaturedBestseller ? (
              <span className="font-sans font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#8B1A1A" }}>★</span>
            ) : <span style={{ opacity: 0.2 }}>—</span>,
          },
        ]}
        rows={products}
        onAdd={() => router.push("/admin/products/new")}
        onEdit={(p) => router.push(`/admin/products/${p.id}/edit`)}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}
