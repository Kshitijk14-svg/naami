"use client";

import { useEffect, useState } from "react";

interface AdminProduct {
  id: number;
  name: string;
  price: string;
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "12px",
  backgroundColor: "#F4F0E6",
  border: "1px solid rgba(17,17,17,0.12)",
  color: "#111111",
  outline: "none",
  fontFamily: "inherit",
};

interface ProductPickerProps {
  value: number | null;
  onChange: (productId: number | null) => void;
}

export function ProductPicker({ value, onChange }: ProductPickerProps) {
  const [products, setProducts] = useState<AdminProduct[]>([]);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data: AdminProduct[]) => setProducts(data))
      .catch(() => {});
  }, []);

  return (
    <select
      style={selectStyle}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">— Select product —</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} — {p.price}
        </option>
      ))}
    </select>
  );
}
