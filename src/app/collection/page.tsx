import { Suspense } from "react";
import CollectionPageContent from "@/components/CollectionPageContent";

export default function CollectionPage() {
  return (
    <Suspense>
      <CollectionPageContent />
    </Suspense>
  );
}
