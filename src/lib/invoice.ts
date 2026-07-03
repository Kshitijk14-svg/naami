import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { orders, invoiceCounters, coupons } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { OrderRow, OrderItemRow } from "@/db/queries/orders";

const BRAND = "#8B1A1A";
const INK = "#111111";
const MUTED = "#666666";

function formatPrice(inr: number): string {
  // pdfkit's built-in fonts have no ₹ glyph — use the ISO code instead.
  return `INR ${inr.toLocaleString("en-IN")}`;
}

function formatIstDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Assign (or return the existing) sequential invoice number for an order.
 * Race-safe: the order row is locked FOR UPDATE so two concurrent calls can't
 * both see "no number yet", and the per-year counter is bumped with an atomic
 * upsert. The partial unique index on orders.invoice_number is the backstop.
 */
export async function ensureInvoiceNumber(orderId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ invoiceNumber: orders.invoiceNumber, createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.invoiceNumber) return order.invoiceNumber;

    // Invoice year follows the order date in IST.
    const year = Number(
      order.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" })
    );

    const [counter] = await tx
      .insert(invoiceCounters)
      .values({ year, counter: 1 })
      .onConflictDoUpdate({
        target: invoiceCounters.year,
        set: { counter: sql`${invoiceCounters.counter} + 1` },
      })
      .returning({ counter: invoiceCounters.counter });

    const invoiceNumber = `NAAMI-INV-${year}-${String(counter.counter).padStart(4, "0")}`;
    await tx.update(orders).set({ invoiceNumber }).where(eq(orders.id, orderId));
    return invoiceNumber;
  });
}

type InvoiceOrder = OrderRow & { invoiceNumber: string };

/** Render the invoice PDF into a Buffer. Order PII must already be decrypted. */
export async function generateInvoicePdf(
  order: InvoiceOrder,
  items: OrderItemRow[]
): Promise<Buffer> {
  let couponCode: string | null = null;
  if (order.couponId && order.discountInr > 0) {
    const [coupon] = await db
      .select({ code: coupons.code })
      .from(coupons)
      .where(eq(coupons.id, order.couponId))
      .limit(1);
    couponCode = coupon?.code ?? null;
  }

  const subtotalInr = order.totalInr + order.discountInr;

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width - 100; // inside margins

  // ── Brand header ──
  doc.fontSize(9).fillColor(BRAND).font("Helvetica-Bold").text("NAAMI ATELIER", { characterSpacing: 3 });
  doc.moveDown(0.3);
  doc.fontSize(24).fillColor(INK).font("Times-Roman").text("Tax Invoice");
  doc.moveTo(50, doc.y + 8).lineTo(50 + pageWidth, doc.y + 8).lineWidth(2).strokeColor(BRAND).stroke();
  doc.moveDown(1.5);

  // ── Invoice meta ──
  const metaTop = doc.y;
  doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold").text("INVOICE NUMBER", 50, metaTop);
  doc.fontSize(11).fillColor(INK).font("Helvetica").text(order.invoiceNumber, 50, metaTop + 12);
  doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold").text("ORDER REFERENCE", 220, metaTop);
  doc.fontSize(11).fillColor(INK).font("Helvetica").text(order.id, 220, metaTop + 12);
  doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold").text("DATE (IST)", 400, metaTop);
  doc.fontSize(11).fillColor(INK).font("Helvetica").text(formatIstDate(order.createdAt), 400, metaTop + 12);
  doc.y = metaTop + 40;

  // ── Bill to ──
  doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold").text("BILLED TO", 50);
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(INK).font("Helvetica").text(order.shippingName ?? "Customer");
  if (order.shippingEmail) doc.fontSize(9).fillColor(MUTED).text(order.shippingEmail);
  if (order.shippingAddress) {
    try {
      const addr = JSON.parse(order.shippingAddress);
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .text(`${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}`)
        .text(`${addr.city}, ${addr.state} — ${addr.pincode}`);
    } catch {
      // unparseable legacy address — omit from invoice
    }
  }
  doc.moveDown(1.5);

  // ── Items table ──
  const col = { name: 50, size: 300, qty: 355, unit: 400, total: 480 };
  const headerY = doc.y;
  doc.fontSize(8).fillColor(BRAND).font("Helvetica-Bold");
  doc.text("ITEM", col.name, headerY);
  doc.text("SIZE", col.size, headerY);
  doc.text("QTY", col.qty, headerY);
  doc.text("UNIT PRICE", col.unit, headerY);
  doc.text("AMOUNT", col.total, headerY, { align: "left" });
  doc.moveTo(50, headerY + 14).lineTo(50 + pageWidth, headerY + 14).lineWidth(0.5).strokeColor(BRAND).stroke();

  let y = headerY + 22;
  doc.font("Helvetica").fontSize(9);
  for (const item of items) {
    doc.fillColor(INK).text(item.productName, col.name, y, { width: 240 });
    const rowHeight = Math.max(doc.heightOfString(item.productName, { width: 240 }), 12);
    doc.fillColor(MUTED).text(item.size ?? "—", col.size, y);
    doc.text(String(item.quantity), col.qty, y);
    doc.text(formatPrice(item.unitPriceInr), col.unit, y);
    doc.fillColor(INK).text(formatPrice(item.unitPriceInr * item.quantity), col.total, y);
    y += rowHeight + 8;
  }
  doc.moveTo(50, y).lineTo(50 + pageWidth, y).lineWidth(0.5).strokeColor("#DDDDDD").stroke();
  y += 12;

  // ── Totals ──
  doc.fontSize(9).fillColor(MUTED).text("Subtotal", 400, y);
  doc.fillColor(INK).text(formatPrice(subtotalInr), col.total, y);
  y += 16;
  if (order.discountInr > 0) {
    doc.fillColor(MUTED).text(`Discount${couponCode ? ` (${couponCode})` : ""}`, 400, y);
    doc.fillColor(INK).text(`- ${formatPrice(order.discountInr)}`, col.total, y);
    y += 16;
  }
  doc.moveTo(400, y).lineTo(50 + pageWidth, y).lineWidth(0.5).strokeColor(BRAND).stroke();
  y += 8;
  doc.fontSize(10).fillColor(BRAND).font("Helvetica-Bold").text("TOTAL", 400, y);
  doc.fontSize(12).fillColor(INK).text(formatPrice(order.totalInr), col.total, y - 1);
  y += 30;

  // ── GST placeholder block ──
  doc.fontSize(8).fillColor(MUTED).font("Helvetica");
  doc.text("GSTIN: —", 50, y);
  doc.text("Tax as applicable. Prices are inclusive of all taxes.", 50, y + 12);
  doc.text("This is a computer-generated invoice and does not require a signature.", 50, y + 24);

  // ── Footer ──
  doc
    .fontSize(8)
    .fillColor("#BBBBBB")
    .text("NAAMI ATELIER · Crafted with care", 50, doc.page.height - 70, {
      width: pageWidth,
      align: "center",
      characterSpacing: 2,
    });

  doc.end();
  return done;
}
