import { db } from "@/lib/db";
import {
  categories,
  products,
  collections,
  collectionProducts,
  productSizes,
} from "./schema";

async function main() {
  console.log("Seeding database...");

  // ─── Categories ──────────────────────────────────────────────────────────────

  const [shirts, overshirts, accessories, limited] = await db
    .insert(categories)
    .values([
      { name: "Shirts", slug: "shirts", description: "Classic and contemporary shirt styles" },
      { name: "Overshirts", slug: "overshirts", description: "Layering pieces and statement outerwear" },
      { name: "Accessories", slug: "accessories", description: "Buttons, collar stays, and finishing touches" },
      { name: "Limited Edition", slug: "limited-edition", description: "One-of-a-kind and small-run pieces" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("Categories seeded.");

  // ─── Products ─────────────────────────────────────────────────────────────────

  const insertedProducts = await db
    .insert(products)
    .values([
      // New Arrivals
      { number: "001", name: "OXFORD STRIPE SHIRT",       subtitle: "120s Egyptian Cotton Oxford",    priceInr: 29900, material: "120s Egyptian long-staple cotton", fit: "Relaxed tuck-in silhouette",     origin: "Handcrafted in Portugal", image: "/images/product-jacket.png",   stock: 10, categoryId: shirts?.id },
      { number: "002", name: "LINEN NATURAL CAMP",         subtitle: "8oz European Linen",            priceInr: 23200, material: "European flax 8oz plain weave",   fit: "Camp collar relaxed",            origin: "Handcrafted in Portugal", image: "/images/product-jeans.png",    stock: 10, categoryId: shirts?.id },
      { number: "003", name: "MOTHER-OF-PEARL BUTTON SET", subtitle: "Hand-polished Shell Buttons",   priceInr: 9900,  material: "Hand-polished nacre shell",        fit: "Universal 4-hole 15mm",          origin: "Sourced in Philippines",  image: "/images/product-hardware.png", stock: 25, categoryId: accessories?.id },
      { number: "004", name: "CHAMBRAY WORK SHIRT",        subtitle: "7oz Cone Mills Chambray",       priceInr: 19900, material: "7oz organic Cone Mills chambray",  fit: "Classic utility fit",            origin: "Handcrafted in Portugal", image: "/images/product-jacket.png",   stock: 10, categoryId: shirts?.id },
      { number: "005", name: "SASHIKO BORO OVERSHIRT",     subtitle: "Hand-stitched Sashiko Weave",   priceInr: 15900, material: "Indigo-dyed heavy sashiko weave",  fit: "Relaxed workshirt fit",          origin: "Handcrafted in Portugal", image: "/images/product-jeans.png",    stock: 10, categoryId: overshirts?.id },
      { number: "006", name: "NAAMI DRESS SHIRT",           subtitle: "100s Sea Island Cotton Poplin", priceInr: 34900, material: "100s Sea Island cotton poplin",    fit: "Slim spread collar",             origin: "Handcrafted in Portugal", image: "/images/product-jacket.png",   stock: 10, categoryId: shirts?.id },
      { number: "007", name: "GURKHA COLLAR SHIRT",         subtitle: "10oz Khadi Cotton",             priceInr: 12500, material: "10oz handspun khadi cotton",       fit: "Gurkha mandarin collar",         origin: "Assembled in India",      image: "/images/product-hardware.png", stock: 10, categoryId: limited?.id },
      // Bestsellers
      { number: "011", name: "TUXEDO BANDED SHIRT",         subtitle: "80s Pima Poplin",               priceInr: 24000, material: "80s Superfine pima poplin",        fit: "Banded collar slim",             origin: "Handcrafted in Portugal", image: "/images/product-jeans.png",    stock: 10, categoryId: shirts?.id },
      { number: "012", name: "NAAMI KURTA SHIRT",            subtitle: "Chanderi Silk-Cotton",          priceInr: 43000, material: "Double-layered pure Chanderi silk-cotton", fit: "Traditional kurta cut",  origin: "Handcrafted in India",    image: "/images/product-jacket.png",   stock: 10, categoryId: limited?.id },
      { number: "013", name: "EVERYDAY CHAMBRAY",            subtitle: "8oz Organic Chambray",          priceInr: 14900, material: "8oz organic cotton chambray",      fit: "Traditional utility cut",        origin: "Assembled in Portugal",   image: "/images/product-hardware.png", stock: 10, categoryId: shirts?.id },
      { number: "014", name: "HAORI OVERSHIRT",              subtitle: "Japanese Shuttle-loom Cotton",  priceInr: 31500, material: "10oz raw Japanese shuttle-loom cotton", fit: "Haori collar relaxed drape", origin: "Handcrafted in Japan",    image: "/images/product-jacket.png",   stock: 10, categoryId: overshirts?.id },
      { number: "015", name: "NAAMI HENLEY SHIRT",           subtitle: "14.5oz Slub Cotton",            priceInr: 28200, material: "14.5oz slub cotton",               fit: "Boxy henley placket",            origin: "Handcrafted in Portugal", image: "/images/product-jacket.png",   stock: 10, categoryId: shirts?.id },
      { number: "016", name: "STONEWASH POPLIN",             subtitle: "Washed Shuttle-loom",           priceInr: 25600, material: "13.5oz washed shuttle-loom cotton", fit: "Easy straight fit",             origin: "Finished in Portugal",    image: "/images/product-jeans.png",    stock: 10, categoryId: shirts?.id },
      { number: "017", name: "NAAMI COLLAR STAY SET",        subtitle: "Sterling Silver",               priceInr: 11600, material: "Sterling silver stays",            fit: "Universal shirt sizing",         origin: "Cast in Japan",           image: "/images/product-hardware.png", stock: 20, categoryId: accessories?.id },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Products seeded: ${insertedProducts.length}`);

  // ─── Sizes for each shirt product ────────────────────────────────────────────

  const shirtSizes = ["S", "M", "L", "XL"];
  const sizeRows = insertedProducts
    .filter((p) => !["003", "017"].includes(p.number)) // accessories have no sizes
    .flatMap((p) => shirtSizes.map((size) => ({ productId: p.id, size })));

  if (sizeRows.length > 0) {
    await db.insert(productSizes).values(sizeRows).onConflictDoNothing();
  }

  // ─── Collections ─────────────────────────────────────────────────────────────

  const [col1, col2] = await db
    .insert(collections)
    .values([
      {
        number: "01",
        name: "OXFORD WHITES",
        tag: "AW26 Collection",
        description: "Egyptian cotton in its purest form — undyed, uncompromised.",
        image: "/images/product-jacket.png",
        isPublished: true,
      },
      {
        number: "02",
        name: "LINEN NATURALS",
        tag: "SS26 Collection",
        description: "European flax grown slow, woven loose, worn forever.",
        image: "/images/product-jeans.png",
        isPublished: true,
      },
    ])
    .onConflictDoNothing()
    .returning();

  // Map old product numbers to new DB ids
  const byNumber = Object.fromEntries(
    insertedProducts.map((p) => [p.number, p.id])
  );

  const cpRows = [];
  if (col1) {
    for (const n of ["001", "006"]) {
      if (byNumber[n]) cpRows.push({ collectionId: col1.id, productId: byNumber[n] });
    }
  }
  if (col2) {
    for (const n of ["002", "004", "013"]) {
      if (byNumber[n]) cpRows.push({ collectionId: col2.id, productId: byNumber[n] });
    }
  }
  if (cpRows.length > 0) {
    await db.insert(collectionProducts).values(cpRows).onConflictDoNothing();
  }

  console.log("Collections seeded.");
  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
