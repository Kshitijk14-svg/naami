export interface Collection {
  id: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
  productIds: number[];
  isPublished: boolean;
  createdAt: number;
}

const collectionMap = new Map<number, Collection>();
let nextId = 1;

function seed(data: Omit<Collection, 'id' | 'createdAt'>) {
  const id = nextId++;
  collectionMap.set(id, { ...data, id, createdAt: Date.now() });
}

seed({
  number: '01',
  name: 'OXFORD WHITES',
  tag: 'AW26 Collection',
  description: 'Egyptian cotton in its purest form — undyed, uncompromised.',
  image: '/images/product-jacket.png',
  productIds: [1, 6],
  isPublished: true,
});

seed({
  number: '02',
  name: 'LINEN NATURALS',
  tag: 'SS26 Collection',
  description: 'European flax grown slow, woven loose, worn forever.',
  image: '/images/product-jeans.png',
  productIds: [2, 4, 13],
  isPublished: true,
});

export function getAllCollections(): Collection[] {
  return Array.from(collectionMap.values());
}

export function getCollection(id: number): Collection | undefined {
  return collectionMap.get(id);
}

export function createCollection(data: Omit<Collection, 'id' | 'createdAt'>): Collection {
  const collection: Collection = { ...data, id: nextId++, createdAt: Date.now() };
  collectionMap.set(collection.id, collection);
  return collection;
}

export function updateCollection(id: number, data: Partial<Omit<Collection, 'id' | 'createdAt'>>): Collection | undefined {
  const existing = collectionMap.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data };
  collectionMap.set(id, updated);
  return updated;
}

export function deleteCollection(id: number): boolean {
  return collectionMap.delete(id);
}
