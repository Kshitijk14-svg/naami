"use client";

import { use } from "react";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CategoryForm categoryId={Number(id)} />;
}
