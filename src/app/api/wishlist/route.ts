import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import {
  getWishlistByUserId,
  getWishlistProductIds,
  addToWishlist,
} from "@/db/queries/wishlist";

async function resolveUser(request: NextRequest) {
  const auth = await verifyAdminRequest(request, [
    "customer",
    "staff",
    "admin",
    "super_admin",
  ]);
  if (auth instanceof Response) return auth;
  const user = await getUserByEmail(auth.email);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  return user;
}

// GET /api/wishlist — returns full wishlist with product details
export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (user instanceof Response) return user;

  const items = await getWishlistByUserId(user.id);
  return Response.json(items);
}

// POST /api/wishlist — body: { productId: number }
// Also supports GET-like mode with ?ids=true to return just product IDs (used by client hydration)
export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (user instanceof Response) return user;

  const body = await request.json();
  const productId = Number(body.productId);
  if (!productId || isNaN(productId)) {
    return Response.json({ error: "productId is required" }, { status: 400 });
  }

  await addToWishlist(user.id, productId);
  const ids = await getWishlistProductIds(user.id);
  return Response.json({ ok: true, ids }, { status: 201 });
}
