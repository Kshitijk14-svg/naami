import type { Metadata } from "next";
import EvanliteFooter from "@/components/EvanliteFooter";
import SectionTitle from "@/components/SectionTitle";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — NAAMI Atelier",
  description: "Get in touch with the NAAMI atelier — questions, orders, and everything in between.",
};

export default function ContactPage() {
  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      <section className="px-6 md:px-12 py-16">
        <SectionTitle
          as="h1"
          kicker="Get In Touch"
          title="Contact"
          accent="Us"
          size="clamp(2.5rem, 5vw, 4.5rem)"
        />

        <div
          className="mt-8 mb-12"
          style={{ height: "1px", background: "linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.1) 2px, transparent)" }}
        />

        <p className="font-sans mb-10 max-w-md" style={{ fontSize: "13px", color: "rgba(17,17,17,0.6)", lineHeight: 1.7 }}>
          Have a question about an order, a piece, or anything else? Send us a message and we&apos;ll get back to you.
        </p>

        <ContactForm />
      </section>

      <EvanliteFooter />
    </main>
  );
}
