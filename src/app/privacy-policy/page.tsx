import type { Metadata } from "next";
import EvanliteFooter from "@/components/EvanliteFooter";
import SectionTitle from "@/components/SectionTitle";

export const metadata: Metadata = {
  title: "Privacy Policy — NAAMI Atelier",
  description: "How NAAMI collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "September 2026";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@naami.example.com";

const HEADING_CLASS = "font-sans font-bold";
const HEADING_STYLE = { fontSize: "18px", color: "#5B1C1C", lineHeight: 1.3 } as const;

const BODY_CLASS = "font-sans";
const BODY_STYLE = { fontSize: "13px", color: "rgba(17,17,17,0.65)", lineHeight: 1.7 } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-2xl mb-10">
      <h2 className={HEADING_CLASS} style={HEADING_STYLE}>
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className={BODY_CLASS} style={BODY_STYLE}>
      {children}
    </p>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className={`${BODY_CLASS} list-disc pl-5 flex flex-col gap-2`} style={BODY_STYLE}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      <section className="px-6 md:px-12 py-16">
        <SectionTitle
          as="h1"
          kicker="Legal"
          title="Privacy"
          accent="Policy"
          size="clamp(2.5rem, 5vw, 4.5rem)"
        />
        <div
          className="mt-8 mb-4"
          style={{ height: "1px", background: "linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.1) 2px, transparent)" }}
        />
        <p className="font-sans font-bold uppercase tracking-[0.2em] mb-12" style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="Introduction">
          <P>
            NAAMI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy and is committed to
            protecting the personal information you share with us when you browse our site, create an
            account, or place an order. This policy explains what we collect, why we collect it, and the
            choices you have.
          </P>
          <P>
            By using this site, you agree to the collection and use of information in accordance with this
            policy.
          </P>
        </Section>

        <Section title="Information We Collect">
          <P>We collect the following categories of information:</P>
          <Ul
            items={[
              "Account information — your name and email address when you create an account or sign in.",
              "Order & shipping information — name, email, phone number, and delivery address, used to fulfil and ship your orders.",
              "Payment information — payments are processed securely by our payment partner, Razorpay. We do not receive or store your full card, UPI, or bank details on our own servers.",
              "Cart & browsing activity — items you add to your cart or wishlist, including for carts left incomplete, so we can help you pick up where you left off.",
              "Technical data — IP address, browser type, and device information, collected automatically to keep the site secure and working correctly.",
            ]}
          />
        </Section>

        <Section title="How We Use Your Information">
          <Ul
            items={[
              "To process, fulfil, and ship your orders, and to keep you updated on their status.",
              "To create and maintain your account.",
              "To respond to your enquiries and provide customer support.",
              "To send order-related and, where you've opted in, promotional communications.",
              "To detect and prevent fraud, and to keep our site secure.",
              "To improve our products, site, and overall shopping experience.",
            ]}
          />
        </Section>

        <Section title="Payment Processing">
          <P>
            All payments on this site are processed by Razorpay, a PCI-DSS compliant payment gateway. When
            you check out, your payment details are submitted directly to Razorpay over an encrypted
            connection — NAAMI does not see or store your card, UPI, or net-banking credentials. Razorpay's
            handling of your payment data is governed by its own privacy policy.
          </P>
        </Section>

        <Section title="Data Sharing">
          <P>We do not sell your personal information. We share it only where necessary to run our business:</P>
          <Ul
            items={[
              "With Razorpay, to process your payment.",
              "With shipping and courier partners, to deliver your order.",
              "With email/SMS service providers, to send order updates and (where opted in) marketing messages.",
              "With professional advisors or authorities, where required by law.",
            ]}
          />
        </Section>

        <Section title="Data Security">
          <P>
            We take reasonable technical and organisational measures to protect your information. Sensitive
            order details such as your phone number and shipping address are encrypted at rest in our
            systems. No method of transmission or storage is completely secure, so while we work to protect
            your data, we cannot guarantee absolute security.
          </P>
        </Section>

        <Section title="Data Retention">
          <P>
            We retain your account and order information for as long as your account is active or as needed
            to provide our services, comply with our legal and tax obligations, resolve disputes, and enforce
            our agreements.
          </P>
        </Section>

        <Section title="Cookies">
          <P>
            We use essential cookies to keep you signed in, remember your cart, and keep the site working
            correctly. You can control cookies through your browser settings, though disabling them may
            affect site functionality such as checkout.
          </P>
        </Section>

        <Section title="Your Rights">
          <P>
            Depending on your location, you may have the right to access, correct, or request deletion of
            your personal information, or to withdraw consent for marketing communications. To exercise
            any of these rights, contact us using the details below.
          </P>
        </Section>

        <Section title="Children's Privacy">
          <P>
            Our site is not directed at children under 18, and we do not knowingly collect personal
            information from children.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this policy from time to time. Changes will be posted on this page with an
            updated &quot;Last updated&quot; date. We encourage you to review this page periodically.
          </P>
        </Section>

        <Section title="Contact Us">
          <P>
            If you have questions about this policy or how we handle your data, reach out to us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:opacity-70" style={{ color: "#5B1C1C" }}>
              {SUPPORT_EMAIL}
            </a>
            .
          </P>
        </Section>
      </section>
      <EvanliteFooter />
    </main>
  );
}
