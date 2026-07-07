"use client";

import { use } from "react";
import { CollectionForm } from "@/components/admin/CollectionForm";

export default function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CollectionForm collectionId={Number(id)} />;
}
