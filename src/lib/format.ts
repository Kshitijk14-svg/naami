export function formatINR(priceInr: number): string {
  return `₹${priceInr.toLocaleString("en-IN")}`;
}
