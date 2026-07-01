import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { removeFromWishlist, getWishlistProductIds } from "@/db/queries/wishlist";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = await verifyAdminRequest(request, [
    "customer",
    "staff",
    "admin",
    "super_admin",
  ]);
  if (auth instanceof Response) return auth;

  const user = await getUserByEmail(auth.email);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { productId } = await params;
  await removeFromWishlist(user.id, Number(productId));
  const ids = await getWishlistProductIds(user.id);
  return Response.json({ ok: true, ids });
}
