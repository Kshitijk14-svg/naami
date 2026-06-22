export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: number;
}

const categoryMap = new Map<number, Category>();
let nextId = 1;

function seed(name: string, slug: string, description?: string) {
  const id = nextId++;
  categoryMap.set(id, { id, name, slug, description, createdAt: Date.now() });
}

seed('Shirts', 'shirts', 'Classic and contemporary shirt styles');
seed('Overshirts', 'overshirts', 'Layering pieces and statement outerwear');
seed('Accessories', 'accessories', 'Buttons, collar stays, and finishing touches');
seed('Limited Edition', 'limited-edition', 'One-of-a-kind and small-run pieces');

export function getAllCategories(): Category[] {
  return Array.from(categoryMap.values());
}

export function getCategory(id: number): Category | undefined {
  return categoryMap.get(id);
}

export function createCategory(data: Omit<Category, 'id' | 'createdAt'>): Category {
  const category: Category = { ...data, id: nextId++, createdAt: Date.now() };
  categoryMap.set(category.id, category);
  return category;
}

export function updateCategory(id: number, data: Partial<Omit<Category, 'id' | 'createdAt'>>): Category | undefined {
  const existing = categoryMap.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data };
  categoryMap.set(id, updated);
  return updated;
}

export function deleteCategory(id: number): boolean {
  return categoryMap.delete(id);
}
