export interface ProductMetafield {
  name: string;
  description: string;
}

export interface CarouselProduct {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  price: string;   // display string e.g. "₹29,900"
  priceInr: number; // integer for cart calculations
  compareAtPriceInr?: number | null;
  metafields: ProductMetafield[];
  image: string;
  thumbnailImage?: string;
  sizes?: { size: string; stock: number }[];
  available?: boolean;
}

function toSizeStock(labels: string[]): { size: string; stock: number }[] {
  return labels.map((size) => ({ size, stock: 10 }));
}

export const newArrivals: CarouselProduct[] = [
  {
    id: 1,
    number: "001",
    name: "OXFORD STRIPE SHIRT",
    subtitle: "120s Egyptian Cotton Oxford",
    price: "₹29,900",
    priceInr: 29900,
    metafields: [
      { name: "Material", description: "120s Egyptian long-staple cotton" },
      { name: "Fit", description: "Relaxed tuck-in silhouette" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jacket.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 2,
    number: "002",
    name: "LINEN NATURAL CAMP",
    subtitle: "8oz European Linen",
    price: "₹23,200",
    priceInr: 23200,
    metafields: [
      { name: "Material", description: "European flax 8oz plain weave" },
      { name: "Fit", description: "Camp collar relaxed" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jeans.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 3,
    number: "003",
    name: "MOTHER-OF-PEARL BUTTON SET",
    subtitle: "Hand-polished Shell Buttons",
    price: "₹9,900",
    priceInr: 9900,
    metafields: [
      { name: "Material", description: "Hand-polished nacre shell" },
      { name: "Fit", description: "Universal 4-hole 15mm" },
      { name: "Origin", description: "Sourced in Philippines" },
    ],
    image: "/images/product-hardware.png",
    sizes: toSizeStock(["One Size"]),
  },
  {
    id: 4,
    number: "004",
    name: "CHAMBRAY WORK SHIRT",
    subtitle: "7oz Cone Mills Chambray",
    price: "₹19,900",
    priceInr: 19900,
    metafields: [
      { name: "Material", description: "7oz organic Cone Mills chambray" },
      { name: "Fit", description: "Classic utility fit" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jacket.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 5,
    number: "005",
    name: "SASHIKO BORO OVERSHIRT",
    subtitle: "Hand-stitched Sashiko Weave",
    price: "₹15,900",
    priceInr: 15900,
    metafields: [
      { name: "Material", description: "Indigo-dyed heavy sashiko weave" },
      { name: "Fit", description: "Relaxed workshirt fit" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jeans.png",
    sizes: toSizeStock(["S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 6,
    number: "006",
    name: "NAAMI DRESS SHIRT",
    subtitle: "100s Sea Island Cotton Poplin",
    price: "₹34,900",
    priceInr: 34900,
    metafields: [
      { name: "Material", description: "100s Sea Island cotton poplin" },
      { name: "Fit", description: "Slim spread collar" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jacket.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 7,
    number: "007",
    name: "GURKHA COLLAR SHIRT",
    subtitle: "10oz Khadi Cotton",
    price: "₹12,500",
    priceInr: 12500,
    metafields: [
      { name: "Material", description: "10oz handspun khadi cotton" },
      { name: "Fit", description: "Gurkha mandarin collar" },
      { name: "Origin", description: "Assembled in India" },
    ],
    image: "/images/product-hardware.png",
    sizes: toSizeStock(["S", "M", "L", "XL"]),
  },
];

export const bestsellers: CarouselProduct[] = [
  {
    id: 11,
    number: "011",
    name: "TUXEDO BANDED SHIRT",
    subtitle: "80s Pima Poplin",
    price: "₹24,000",
    priceInr: 24000,
    metafields: [
      { name: "Material", description: "80s Superfine pima poplin" },
      { name: "Fit", description: "Banded collar slim" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jeans.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 12,
    number: "012",
    name: "NAAMI KURTA SHIRT",
    subtitle: "Chanderi Silk-Cotton",
    price: "₹43,000",
    priceInr: 43000,
    metafields: [
      { name: "Material", description: "Double-layered pure Chanderi silk-cotton" },
      { name: "Fit", description: "Traditional kurta cut" },
      { name: "Origin", description: "Handcrafted in India" },
    ],
    image: "/images/product-jacket.png",
    sizes: toSizeStock(["S", "M", "L", "XL"]),
  },
  {
    id: 13,
    number: "013",
    name: "EVERYDAY CHAMBRAY",
    subtitle: "8oz Organic Chambray",
    price: "₹14,900",
    priceInr: 14900,
    metafields: [
      { name: "Material", description: "8oz organic cotton chambray" },
      { name: "Fit", description: "Traditional utility cut" },
      { name: "Origin", description: "Assembled in Portugal" },
    ],
    image: "/images/product-hardware.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 14,
    number: "014",
    name: "HAORI OVERSHIRT",
    subtitle: "Japanese Shuttle-loom Cotton",
    price: "₹31,500",
    priceInr: 31500,
    metafields: [
      { name: "Material", description: "10oz raw Japanese shuttle-loom cotton" },
      { name: "Fit", description: "Haori collar relaxed drape" },
      { name: "Origin", description: "Handcrafted in Japan" },
    ],
    image: "/images/product-jacket.png",
    sizes: toSizeStock(["S", "M", "L", "XL"]),
  },
  {
    id: 15,
    number: "015",
    name: "NAAMI HENLEY SHIRT",
    subtitle: "14.5oz Slub Cotton",
    price: "₹28,200",
    priceInr: 28200,
    metafields: [
      { name: "Material", description: "14.5oz slub cotton" },
      { name: "Fit", description: "Boxy henley placket" },
      { name: "Origin", description: "Handcrafted in Portugal" },
    ],
    image: "/images/product-jacket.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 16,
    number: "016",
    name: "STONEWASH POPLIN",
    subtitle: "Washed Shuttle-loom",
    price: "₹25,600",
    priceInr: 25600,
    metafields: [
      { name: "Material", description: "13.5oz washed shuttle-loom cotton" },
      { name: "Fit", description: "Easy straight fit" },
      { name: "Origin", description: "Finished in Portugal" },
    ],
    image: "/images/product-jeans.png",
    sizes: toSizeStock(["XS", "S", "M", "L", "XL", "XXL"]),
  },
  {
    id: 17,
    number: "017",
    name: "NAAMI COLLAR STAY SET",
    subtitle: "Sterling Silver",
    price: "₹11,600",
    priceInr: 11600,
    metafields: [
      { name: "Material", description: "Sterling silver stays" },
      { name: "Fit", description: "Universal shirt sizing" },
      { name: "Origin", description: "Cast in Japan" },
    ],
    image: "/images/product-hardware.png",
    sizes: toSizeStock(["One Size"]),
  },
];

export const allProducts = [...newArrivals, ...bestsellers];
