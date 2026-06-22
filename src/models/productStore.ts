import { allProducts, CarouselProduct } from './products';

export interface Product extends CarouselProduct {
  priceINR: number;
  category?: string;
  stock: number;
  isPublished: boolean;
  sizes?: string[];
}

function parsePrice(price: string): number {
  return parseInt(price.replace(/[₹,]/g, ''), 10) || 0;
}

const productMap = new Map<number, Product>(
  allProducts.map((p) => [
    p.id,
    {
      ...p,
      priceINR: parsePrice(p.price),
      stock: 10,
      isPublished: true,
      category: undefined,
      sizes: ['S', 'M', 'L', 'XL'],
    },
  ])
);

let nextId = 18;

export function getAllProducts(): Product[] {
  return Array.from(productMap.values());
}

export function getProduct(id: number): Product | undefined {
  return productMap.get(id);
}

export function createProduct(data: Omit<Product, 'id'>): Product {
  const product: Product = { ...data, id: nextId++ };
  productMap.set(product.id, product);
  return product;
}

export function updateProduct(id: number, data: Partial<Omit<Product, 'id'>>): Product | undefined {
  const existing = productMap.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data };
  productMap.set(id, updated);
  return updated;
}

export function deleteProduct(id: number): boolean {
  return productMap.delete(id);
}
