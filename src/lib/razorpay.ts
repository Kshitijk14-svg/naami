import { createHmac, timingSafeEqual } from "node:crypto";
import { createLogger } from "@/lib/logger";

// Server-side Razorpay REST client.
//
// The checkout signature only proves that Razorpay signed some (order, payment)
// pair for our merchant account. It carries no amount and no cart. Everything
// that decides whether an order is real — how much was captured, which gateway
// order it belongs to, whether the money actually moved — has to be read back
// from Razorpay itself. That is what this module is for.

const log = createLogger("razorpay");

const API_BASE = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 15_000;

export class RazorpayError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Thrown when a payment does not match the intent it claims to pay for. */
export class PaymentMismatchError extends Error {}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number; // paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string | null;
  method?: string;
  captured?: boolean;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number; // paise
  amount_paid: number;
  currency: string;
  status: "created" | "attempted" | "paid";
  receipt?: string;
  notes?: Record<string, string>;
}

function credentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new RazorpayError("Razorpay credentials are not configured.");
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // A network failure must never read as "the payment is fine" — surface it
    // so the caller fails closed instead of creating an unpaid order.
    throw new RazorpayError(
      `Razorpay request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log.error("api error", { path, status: res.status, body });
    throw new RazorpayError(`Razorpay returned ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}

/** Create a gateway order for `amountInr` whole rupees. */
export async function createRazorpayOrder(input: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountInr * 100, // paise
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
}

export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function fetchOrder(orderId: string): Promise<RazorpayOrder> {
  return call<RazorpayOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

/**
 * Capture an authorized payment for exactly `amountInr`. Razorpay rejects a
 * capture above the authorized amount, so this doubles as an amount assertion.
 */
export async function capturePayment(
  paymentId: string,
  amountInr: number
): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount: amountInr * 100, currency: "INR" }),
  });
}

/** Refund a payment. Used to make good on a post-capture failure. */
export async function refundPayment(
  paymentId: string,
  amountInr: number,
  notes?: Record<string, string>
): Promise<{ id: string; status: string }> {
  return call<{ id: string; status: string }>(
    `/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      method: "POST",
      body: JSON.stringify({ amount: amountInr * 100, speed: "normal", notes }),
    }
  );
}

// ─── Signature verification ───────────────────────────────────────────────────

/** Constant-time hex-digest compare — never leaks match progress via timing. */
export function signaturesMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual ?? "");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Checkout callback signature: HMAC-SHA256 over `order_id|payment_id`. */
export function verifyCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return signaturesMatch(expected, signature);
}

/**
 * Webhook signature: HMAC-SHA256 over the RAW request body. Must be given the
 * exact bytes received — re-serializing parsed JSON changes the digest.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signaturesMatch(expected, signature);
}

// ─── The authoritative "was this really paid?" check ──────────────────────────

/**
 * Confirm that `paymentId` is a real, captured payment for `razorpayOrderId` of
 * exactly `expectedInr`. Captures the payment first if it is merely authorized —
 * a valid checkout signature is issued for authorized payments too, so
 * "signature verified" on its own does not mean the money moved.
 *
 * Returns the confirmed payment, or throws PaymentMismatchError.
 */
export async function assertPaymentMatches(input: {
  paymentId: string;
  razorpayOrderId: string;
  expectedInr: number;
}): Promise<RazorpayPayment> {
  const { paymentId, razorpayOrderId, expectedInr } = input;
  let payment = await fetchPayment(paymentId);

  if (payment.order_id !== razorpayOrderId) {
    throw new PaymentMismatchError(
      `Payment ${paymentId} belongs to order ${payment.order_id ?? "none"}, not ${razorpayOrderId}.`
    );
  }
  if (payment.currency !== "INR") {
    throw new PaymentMismatchError(`Unexpected currency ${payment.currency}.`);
  }
  if (payment.amount !== expectedInr * 100) {
    throw new PaymentMismatchError(
      `Amount mismatch: gateway has ${payment.amount} paise, order is for ${expectedInr * 100}.`
    );
  }

  if (payment.status === "authorized") {
    log.info("capturing authorized payment", { paymentId, expectedInr });
    payment = await capturePayment(paymentId, expectedInr);
  }

  if (payment.status !== "captured") {
    throw new PaymentMismatchError(`Payment is ${payment.status}, not captured.`);
  }
  // Re-assert after capture: the capture response is the final word on amount.
  if (payment.amount !== expectedInr * 100) {
    throw new PaymentMismatchError(
      `Post-capture amount mismatch: ${payment.amount} paise vs expected ${expectedInr * 100}.`
    );
  }

  return payment;
}
