import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { createFeedback, userOwnsOrder } from "@/db/queries/brandFeedback";
import { checkRateLimit } from "@/lib/redis";

const MAX_COMMENT_LENGTH = 1000;

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const user = await getUserByEmail(auth.email);
  if (!user) {
    return Response.json({ error: "User not found." }, { status: 401 });
  }

  // Fail-open rate limit (same pattern as apply-coupon): 5 submissions/hour per user.
  const rate = await checkRateLimit(`feedback:${user.id}`, { requests: 5, window: "1 h" });
  if (rate?.limited) {
    return Response.json(
      { error: "Too many feedback submissions. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment: string | undefined = typeof body?.comment === "string" ? body.comment.trim() : undefined;
  const orderId: string | undefined = typeof body?.orderId === "string" ? body.orderId.trim() : undefined;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating must be an integer between 1 and 5." }, { status: 400 });
  }
  if (comment !== undefined && comment.length > MAX_COMMENT_LENGTH) {
    return Response.json({ error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (orderId) {
    const owns = await userOwnsOrder(user.id, orderId);
    if (!owns) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }
  }

  const feedback = await createFeedback({
    userId: user.id,
    orderId: orderId || null,
    rating,
    comment: comment || null,
  });

  return Response.json({ id: feedback.id }, { status: 201 });
}
