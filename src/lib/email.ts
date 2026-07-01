import { Resend } from "resend";
import { createLogger } from "./logger";

const log = createLogger("email");
const resend = new Resend(process.env.RESEND_API_KEY);

// Use your verified Resend sender domain. Falls back to the Resend test address
// if RESEND_FROM is not set (works for testing, not for production sends).
const FROM = process.env.RESEND_FROM ?? "NAAMI Atelier <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.GMAIL_USER ?? "";

function formatPrice(inr: number): string {
  return `₹${inr.toLocaleString("en-IN")}`;
}

interface OrderItem {
  productName: string;
  unitPriceInr: number;
  quantity: number;
  size?: string | null;
}

interface OrderSummary {
  id: string;
  totalInr: number;
  shippingName?: string | null;
  shippingAddress?: string | null;
}

function buildOrderHtml(order: OrderSummary, items: OrderItem[]): string {
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(139,26,26,0.08);font-family:Georgia,serif;font-size:14px;color:#111;">
          ${item.productName}${item.size ? ` <span style="font-size:11px;color:#888;">(${item.size})</span>` : ""}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(139,26,26,0.08);text-align:center;font-family:sans-serif;font-size:13px;color:#555;">
          ${item.quantity}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(139,26,26,0.08);text-align:right;font-family:sans-serif;font-size:13px;color:#111;">
          ${formatPrice(item.unitPriceInr * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  let addressBlock = "";
  if (order.shippingAddress) {
    try {
      const addr = JSON.parse(order.shippingAddress);
      addressBlock = `
        <p style="margin:4px 0;font-family:sans-serif;font-size:13px;color:#555;">
          ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}<br/>
          ${addr.city}, ${addr.state} — ${addr.pincode}
        </p>`;
    } catch {
      addressBlock = "";
    }
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background:#F4F0E6;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-top:3px solid #8B1A1A;">
        <!-- Header -->
        <tr><td style="padding:32px 40px 16px;">
          <p style="font-family:sans-serif;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#8B1A1A;margin:0 0 8px;">
            NAAMI ATELIER
          </p>
          <h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;color:#111;margin:0;letter-spacing:0.02em;">
            Order Confirmed
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:8px 40px 32px;">
          <p style="font-family:sans-serif;font-size:13px;color:#555;line-height:1.6;">
            Dear ${order.shippingName ?? "Valued Customer"},<br/>
            Thank you for your order. We will begin crafting your pieces shortly.
          </p>

          <p style="font-family:sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8B1A1A;margin:24px 0 8px;">
            Order Reference
          </p>
          <p style="font-family:Georgia,serif;font-size:18px;color:#111;margin:0 0 20px;">${order.id}</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="text-align:left;font-family:sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#8B1A1A;padding-bottom:8px;">Item</th>
              <th style="text-align:center;font-family:sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#8B1A1A;padding-bottom:8px;">Qty</th>
              <th style="text-align:right;font-family:sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#8B1A1A;padding-bottom:8px;">Amount</th>
            </tr>
            ${itemRows}
            <tr>
              <td colspan="2" style="padding-top:16px;font-family:sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#8B1A1A;">Total</td>
              <td style="padding-top:16px;text-align:right;font-family:Georgia,serif;font-size:18px;color:#111;">${formatPrice(order.totalInr)}</td>
            </tr>
          </table>

          ${addressBlock ? `
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(139,26,26,0.12);">
            <p style="font-family:sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#8B1A1A;margin:0 0 8px;">
              Shipping To
            </p>
            ${addressBlock}
          </div>` : ""}

          <p style="margin-top:32px;font-family:sans-serif;font-size:12px;color:#888;line-height:1.7;">
            Questions? Reply to this email or contact us at
            <a href="mailto:${ADMIN_EMAIL}" style="color:#8B1A1A;">${ADMIN_EMAIL}</a>.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(139,26,26,0.1);text-align:center;">
          <p style="font-family:sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#bbb;margin:0;">
            NAAMI ATELIER · Crafted with care
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmation(
  to: string,
  order: OrderSummary,
  items: OrderItem[]
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your NAAMI Order — ${order.id}`,
      html: buildOrderHtml(order, items),
    });
  } catch (err) {
    log.error("sendOrderConfirmation failed", { err });
    throw err; // surface to the jobs worker so it retries with backoff
  }
}

export async function sendAbandonedCartReminder(
  to: string,
  items: OrderItem[]
): Promise<void> {
  const itemList = items
    .map((i) => `<li style="margin:4px 0;font-family:sans-serif;font-size:13px;color:#555;">${i.productName}${i.size ? ` (${i.size})` : ""} × ${i.quantity}</li>`)
    .join("");

  const html = `
<!DOCTYPE html><html><body style="background:#F4F0E6;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-top:3px solid #8B1A1A;">
      <tr><td style="padding:32px 40px 16px;">
        <p style="font-family:sans-serif;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#8B1A1A;margin:0 0 8px;">NAAMI ATELIER</p>
        <h1 style="font-family:Georgia,serif;font-weight:300;font-size:26px;color:#111;margin:0;">
          Your wardrobe is waiting.
        </h1>
      </td></tr>
      <tr><td style="padding:8px 40px 32px;">
        <p style="font-family:sans-serif;font-size:13px;color:#555;line-height:1.6;">
          You left some pieces behind. They are still reserved for you.
        </p>
        <ul style="padding-left:16px;">${itemList}</ul>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://naami.in"}/cart"
           style="display:inline-block;margin-top:20px;padding:14px 28px;background:#8B1A1A;color:#F4F0E6;font-family:sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;">
          Complete Your Order →
        </a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your NAAMI cart is waiting",
      html,
    });
  } catch (err) {
    log.error("sendAbandonedCartReminder failed", { err });
    throw err; // surface to the jobs worker so it retries with backoff
  }
}

interface LowStockProduct {
  name: string;
  number: string;
  stock: number;
  lowStockThreshold: number;
}

export async function sendLowStockAlert(
  stockItems: LowStockProduct[]
): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const rows = stockItems
    .map(
      (p) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${p.number} — ${p.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#8B1A1A;text-align:center;">${p.stock}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#888;text-align:center;">${p.lowStockThreshold}</td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;">
  <h2 style="color:#8B1A1A;">⚠ Low Stock Alert — NAAMI</h2>
  <p>The following products have fallen below their stock threshold:</p>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:500px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Product</th>
        <th style="padding:8px 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Stock</th>
        <th style="padding:8px 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Threshold</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#888;">Update stock at /admin/products</p>
</body></html>`;

  try {
    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[NAAMI] Low Stock Alert — ${stockItems.length} product${stockItems.length > 1 ? "s" : ""}`,
      html,
    });
  } catch (err) {
    log.error("sendLowStockAlert failed", { err });
    throw err; // surface to the jobs worker so it retries with backoff
  }
}
