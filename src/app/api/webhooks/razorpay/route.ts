import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { fulfilOrder } from "@/lib/fulfilOrder";
import { recordPaymentIncident } from "@/db/queries/checkoutIntents";
import { createLogger } from "@/lib/logger";

// Razorpay server-to-server notifications.
//
// This is what makes an order survive the browser. The checkout page only
// creates an order if its callback runs — a closed tab, a dropped connection or
// a thrown handler after capture used to mean money taken and no order, with no
// way to notice. Razorpay retries this endpoint until it gets a 2xx, so the
// order lands either way.
//
// Authenticated purely by signature: there is no session behind a webhook.

export const dynamic = "force-dynamic";

const log = createLogger("razorpay-webhook");

/** Events we act on. Anything else is acknowledged and ignored. */
const HANDLED = new Set(["payment.captured", "order.paid"]);

interface WebhookEnvelope {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string | null; amount?: number } };
    order?: { entity?: { id?: string } };
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    // Fail closed. An unconfigured webhook must never accept unsigned traffic.
    log.warn("webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // The signature covers the exact bytes received — parsing and re-serializing
  // would change the digest, so read the body as text and parse it after.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    log.warn("webhook signature verification failed");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let envelope: WebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as WebhookEnvelope;
  } catch {
    return Response.json({ error: "Malformed payload" }, { status: 400 });
  }

  const event = envelope.event ?? "";
  if (!HANDLED.has(event)) {
    // 200 so Razorpay stops retrying events we deliberately ignore.
    return Response.json({ received: true, handled: false, event });
  }

  const payment = envelope.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id ?? envelope.payload?.order?.entity?.id ?? null;
  const razorpayPaymentId = payment?.id ?? null;

  if (!razorpayOrderId || !razorpayPaymentId) {
    // order.paid without a payment entity carries nothing we can act on.
    log.info("webhook event lacked usable ids", { event });
    return Response.json({ received: true, handled: false, event });
  }

  try {
    const result = await fulfilOrder({
      razorpayOrderId,
      razorpayPaymentId,
      source: "webhook",
      // No session here; ownership comes from the intent itself.
    });

    if (result.ok) {
      log.info("webhook fulfilled payment", {
        event,
        orderId: result.orderId,
        alreadyExisted: result.alreadyExisted,
      });
    } else {
      log.error("webhook could not fulfil payment", {
        event,
        razorpayPaymentId,
        reason: result.error,
      });
    }

    // Always 2xx once the signature is valid and we have recorded the outcome.
    // Retrying would not change anything — fulfilOrder already logged an
    // incident for whatever needs a human.
    return Response.json({ received: true, handled: true, event });
  } catch (err) {
    // An unexpected fault: record it, then let Razorpay retry.
    log.error("webhook handler threw", { event, razorpayPaymentId, err });
    await recordPaymentIncident({
      razorpayOrderId,
      razorpayPaymentId,
      reason: `Webhook handler error: ${err instanceof Error ? err.message : String(err)}`,
      source: "webhook",
    });
    return Response.json({ error: "Handler error" }, { status: 500 });
  }
}
