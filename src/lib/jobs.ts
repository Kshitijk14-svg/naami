import { db } from "@/lib/db";
import { jobs } from "@/db/schema";
import { and, eq, lte, lt, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import {
  sendOrderConfirmation,
  sendLowStockAlert,
  sendAbandonedCartReminder,
  sendOrderStatusUpdate,
  sendInvoiceEmail,
  type StatusTracking,
} from "@/lib/email";

const log = createLogger("jobs");

// A Drizzle executor: either the primary db or a transaction handle. Lets
// enqueueJob participate in the caller's transaction (transactional outbox).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

// Reclaim jobs stuck in "processing" (worker crashed mid-run) after this long.
const STALE_PROCESSING_MS = 5 * 60 * 1000;
// Exponential backoff base between retries.
const BACKOFF_BASE_MS = 30 * 1000;

export type JobType =
  | "email:order_confirmation"
  | "email:low_stock"
  | "email:abandoned_cart"
  | "email:order_status"
  | "email:invoice";

type EmailItem = { productName: string; unitPriceInr: number; quantity: number; size?: string | null };
type OrderPayload = {
  to: string;
  order: { id: string; totalInr: number; shippingName?: string | null; shippingAddress?: string | null };
  items: EmailItem[];
};
type LowStockPayload = {
  items: { name: string; number: string; stock: number; lowStockThreshold: number }[];
};
type AbandonedCartPayload = { to: string; items: EmailItem[] };
type OrderStatusPayload = {
  to: string;
  orderId: string;
  toStatus: string;
  shippingName?: string | null;
  tracking?: StatusTracking;
};
// Invoice jobs carry only the order id — the worker regenerates the PDF at
// send time so attachment bytes never live in the jobs table.
type InvoicePayload = { orderId: string };

// One handler per job type. Handlers receive the parsed payload and should throw
// on failure so the worker retries with backoff.
const HANDLERS: Record<JobType, (payload: unknown) => Promise<void>> = {
  "email:order_confirmation": (p) => {
    const { to, order, items } = p as OrderPayload;
    return sendOrderConfirmation(to, order, items);
  },
  "email:low_stock": (p) => sendLowStockAlert((p as LowStockPayload).items),
  "email:abandoned_cart": (p) => {
    const { to, items } = p as AbandonedCartPayload;
    return sendAbandonedCartReminder(to, items);
  },
  "email:order_status": (p) => {
    const { to, orderId, toStatus, shippingName, tracking } = p as OrderStatusPayload;
    return sendOrderStatusUpdate(to, { orderId, toStatus, shippingName, tracking });
  },
  "email:invoice": async (p) => {
    const { orderId } = p as InvoicePayload;
    // Lazy import avoids loading pdfkit unless an invoice job actually runs.
    const { getOrderById, getOrderItems } = await import("@/db/queries/orders");
    const { ensureInvoiceNumber, generateInvoicePdf } = await import("@/lib/invoice");

    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Invoice job: order ${orderId} not found`);
    if (!order.shippingEmail) throw new Error(`Invoice job: order ${orderId} has no email`);

    const invoiceNumber = await ensureInvoiceNumber(orderId);
    const items = await getOrderItems(orderId);
    const pdf = await generateInvoicePdf({ ...order, invoiceNumber }, items);

    await sendInvoiceEmail(
      order.shippingEmail,
      {
        orderId,
        invoiceNumber,
        totalInr: order.totalInr,
        shippingName: order.shippingName,
      },
      pdf
    );
  },
};

/**
 * Enqueue a job. Pass the surrounding transaction (`tx`) to make the enqueue
 * atomic with the state change that triggers it — the classic outbox pattern:
 * if the transaction rolls back, the job is never created.
 */
export async function enqueueJob(
  type: JobType,
  payload: unknown,
  exec: Executor = db
): Promise<void> {
  await exec.insert(jobs).values({
    type,
    payload: JSON.stringify(payload),
  });
}

/**
 * Drain the queue. Claims up to `limit` due jobs with FOR UPDATE SKIP LOCKED so
 * multiple workers never grab the same row, runs each handler, and marks the job
 * done or schedules a backoff retry. Returns a small summary for the caller/log.
 */
export async function processJobs(limit = 10): Promise<{ processed: number; failed: number }> {
  // Recover jobs orphaned by a crashed worker.
  await db
    .update(jobs)
    .set({ status: "pending", updatedAt: new Date() })
    .where(
      and(
        eq(jobs.status, "processing"),
        lt(jobs.updatedAt, new Date(Date.now() - STALE_PROCESSING_MS))
      )
    );

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    // 1. Atomically claim the next due job.
    const claimed = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(jobs)
        .where(and(eq(jobs.status, "pending"), lte(jobs.runAt, new Date())))
        .orderBy(jobs.runAt)
        .limit(1)
        .for("update", { skipLocked: true });

      if (!row) return null;

      await tx
        .update(jobs)
        .set({ status: "processing", attempts: row.attempts + 1, updatedAt: new Date() })
        .where(eq(jobs.id, row.id));

      return row;
    });

    if (!claimed) break; // queue drained

    // 2. Run the handler outside the lock.
    const handler = HANDLERS[claimed.type as JobType];
    try {
      if (!handler) throw new Error(`No handler for job type "${claimed.type}"`);
      await handler(JSON.parse(claimed.payload));
      await db
        .update(jobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(jobs.id, claimed.id));
      processed++;
    } catch (err) {
      failed++;
      const attempts = claimed.attempts + 1;
      const exhausted = attempts >= claimed.maxAttempts;
      const backoff = BACKOFF_BASE_MS * 2 ** (attempts - 1);
      await db
        .update(jobs)
        .set({
          status: exhausted ? "failed" : "pending",
          runAt: new Date(Date.now() + backoff),
          lastError: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, claimed.id));
      log.error("job failed", {
        id: claimed.id,
        type: claimed.type,
        attempts,
        exhausted,
        err,
      });
    }
  }

  if (processed || failed) log.info("drained queue", { processed, failed });
  return { processed, failed };
}

/** Count of jobs still owed work — handy for the readiness probe / metrics. */
export async function pendingJobCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(eq(jobs.status, "pending"));
  return row?.n ?? 0;
}
