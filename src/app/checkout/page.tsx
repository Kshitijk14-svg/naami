"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/models/cartStore";
import { trackEvent } from "@/components/MetaPixel";
import EvanliteFooter from "@/components/EvanliteFooter";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function formatPrice(inr: number): string {
  return `₹${inr.toLocaleString("en-IN")}`;
}

interface AddressForm {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: AddressForm = {
  name: "", email: "", phone: "",
  line1: "", line2: "", city: "", state: "", pincode: "",
};

function validate(form: AddressForm): string | null {
  if (!form.name.trim()) return "Full name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Valid email is required.";
  if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) return "10-digit phone number is required.";
  if (!form.line1.trim()) return "Address line 1 is required.";
  if (!form.city.trim()) return "City is required.";
  if (!form.state.trim()) return "State is required.";
  if (!/^\d{6}$/.test(form.pincode.trim())) return "6-digit PIN code is required.";
  return null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponParam = searchParams.get("coupon") ?? "";

  const { items, cartItemsCount, clearCart } = useCartStore();
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, i) => sum + i.priceInr * i.quantity, 0);

  useEffect(() => {
    if (cartItemsCount === 0) router.replace("/cart");
  }, [cartItemsCount, router]);

  const update = (field: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePay = async () => {
    const validationError = validate(form);
    if (validationError) { setError(validationError); return; }
    if (typeof window.Razorpay === "undefined") {
      setError("Payment gateway not loaded. Please refresh the page.");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      // 1. Create Razorpay order on server
      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingName: form.name,
          shippingEmail: form.email,
          shippingPhone: form.phone,
          shippingAddress: { line1: form.line1, line2: form.line2 || undefined, city: form.city, state: form.state, pincode: form.pincode },
          couponCode: couponParam || undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) { setError(createData.error ?? "Could not create order."); setProcessing(false); return; }

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: createData.amount,
        currency: createData.currency,
        order_id: createData.razorpayOrderId,
        name: "NAAMI Atelier",
        description: `Order — ${items.length} item${items.length > 1 ? "s" : ""}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#8B1A1A" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // 3. Verify payment and create DB order
          const verifyRes = await fetch("/api/checkout/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              items,
              shippingName: form.name,
              shippingEmail: form.email,
              shippingPhone: form.phone,
              shippingAddress: { line1: form.line1, line2: form.line2 || undefined, city: form.city, state: form.state, pincode: form.pincode },
              couponCode: couponParam || undefined,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) { setError(verifyData.error ?? "Payment verification failed."); setProcessing(false); return; }

          trackEvent("Purchase", {
            value: subtotal / 100,
            currency: "INR",
            content_ids: items.map((i) => String(i.productId)),
          });

          clearCart();
          router.push(`/orders/${verifyData.orderId}`);
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.open();
    } catch (err) {
      console.error("[checkout]", err);
      setError("An unexpected error occurred. Please try again.");
      setProcessing(false);
    }
  };

  const inputCls = "w-full font-sans px-4 py-3 outline-none border transition-colors focus:border-[rgba(139,26,26,0.4)]";
  const inputStyle = {
    fontSize: "13px",
    backgroundColor: "#fff",
    border: "1px solid rgba(17,17,17,0.12)",
    color: "#111",
  };

  const LabeledInput = ({ label, field, type = "text", placeholder = "" }: { label: string; field: keyof AddressForm; type?: string; placeholder?: string }) => (
    <div>
      <label className="block font-sans font-bold uppercase tracking-[0.18em] mb-1.5" style={{ fontSize: "8px", color: "rgba(17,17,17,0.45)" }}>
        {label}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={update(field)}
        placeholder={placeholder}
        className={inputCls}
        style={inputStyle}
      />
    </div>
  );

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-20"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-12">
        <div className="mb-10">
          <p className="font-sans font-bold uppercase tracking-[0.3em] mb-2" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            NAAMI // CHECKOUT
          </p>
          <h1 className="font-serif font-light uppercase" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#111", letterSpacing: "0.03em" }}>
            Complete Order
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Address Form */}
          <div className="flex-1">
            <p className="font-sans font-bold uppercase tracking-[0.22em] mb-6" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              Shipping Details
            </p>

            <div className="flex flex-col gap-4">
              <LabeledInput label="Full Name *" field="name" placeholder="As on courier" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabeledInput label="Email *" field="email" type="email" placeholder="For receipt" />
                <LabeledInput label="Phone *" field="phone" type="tel" placeholder="10-digit mobile" />
              </div>
              <LabeledInput label="Address Line 1 *" field="line1" placeholder="Building, street" />
              <LabeledInput label="Address Line 2" field="line2" placeholder="Landmark, area (optional)" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LabeledInput label="City *" field="city" />
                <LabeledInput label="State *" field="state" />
                <LabeledInput label="PIN Code *" field="pincode" placeholder="6-digit" />
              </div>
            </div>

            {error && (
              <div className="mt-6 px-4 py-3" style={{ backgroundColor: "rgba(139,26,26,0.08)", border: "1px solid rgba(139,26,26,0.2)" }}>
                <p className="font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{error}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full font-sans font-bold uppercase tracking-[0.25em] mt-8 py-5 hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
              style={{ fontSize: "11px", backgroundColor: "#8B1A1A", color: "#F4F0E6", border: "none" }}
            >
              {processing ? "Processing…" : `Pay ${formatPrice(subtotal)} Securely →`}
            </button>

            <p className="font-sans mt-3 text-center" style={{ fontSize: "10px", color: "rgba(17,17,17,0.35)" }}>
              Secured by Razorpay · 256-bit SSL encryption
            </p>
          </div>

          {/* Order Summary */}
          <div className="lg:w-80 flex-shrink-0">
            <div style={{ backgroundColor: "#EDE8DC", padding: "28px" }}>
              <p className="font-sans font-bold uppercase tracking-[0.25em] mb-6" style={{ fontSize: "9px", color: "#8B1A1A" }}>
                Your Order
              </p>
              {items.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex justify-between mb-4">
                  <div className="flex-1 pr-3">
                    <p className="font-serif font-light" style={{ fontSize: "13px", color: "#111", lineHeight: 1.3 }}>
                      {item.name}
                    </p>
                    <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)" }}>
                      {item.size} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-sans font-bold" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
                    {formatPrice(item.priceInr * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-4 mt-2" style={{ borderTop: "1px solid rgba(139,26,26,0.15)" }}>
                <span className="font-sans font-bold uppercase tracking-[0.15em]" style={{ fontSize: "10px" }}>Total</span>
                <span className="font-serif font-light" style={{ fontSize: "20px" }}>{formatPrice(subtotal)}</span>
              </div>
              <Link
                href="/cart"
                className="block text-center font-sans font-bold uppercase tracking-[0.15em] mt-5 hover:opacity-50 transition-opacity"
                style={{ fontSize: "8px", color: "rgba(17,17,17,0.4)" }}
              >
                ← Edit Cart
              </Link>
            </div>
          </div>
        </div>
      </div>

      <EvanliteFooter />
    </main>
  );
}
