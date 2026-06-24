import type { MetadataRoute } from "next";
import { getAllProducts } from "@/db/queries/products";
import { getPublishedPosts } from "@/db/queries/blog";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naamiatelier.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,           lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/collection`, lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/about`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/journal`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/cart`,       lastModified: new Date(), changeFrequency: "never",   priority: 0.2 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getAllProducts();
    productRoutes = products.map((p) => ({
      url: `${BASE}/product/${p.id}`,
      lastModified: p.updatedAt ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {}

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedPosts();
    blogRoutes = posts.map((p) => ({
      url: `${BASE}/journal/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));
  } catch {}

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
}
