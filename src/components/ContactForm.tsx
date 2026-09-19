"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 0",
  fontSize: "14px",
  color: "#1A1212",
  background: "transparent",
  border: "none",
  borderBottom: "1.5px solid #5B1C1C",
  borderRadius: 0,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "rgba(17,17,17,0.5)",
};

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to send your message.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Failed to send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="px-8 py-6" style={{ backgroundColor: "#F8F1E5", borderLeft: "3px solid #5B1C1C" }}>
        <p className="font-serif font-light" style={{ fontSize: "1.05rem", color: "#111" }}>
          Thank you for reaching out — we&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 max-w-md">
      <div>
        <label htmlFor="contact-name" className="font-sans font-bold uppercase tracking-[0.2em] block mb-1" style={labelStyle}>
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-sans"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="font-sans font-bold uppercase tracking-[0.2em] block mb-1" style={labelStyle}>
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="font-sans"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="font-sans font-bold uppercase tracking-[0.2em] block mb-1" style={labelStyle}>
          Message
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
          className="font-sans"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {error && (
        <p className="font-sans" style={{ fontSize: "11px", color: "#c0392b" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="font-sans font-bold uppercase tracking-[0.25em] px-8 py-4 hover:opacity-80 transition-opacity disabled:opacity-40"
        style={{ fontSize: "10px", backgroundColor: "#5B1C1C", color: "#FFF9EF", border: "none", cursor: submitting ? "wait" : "pointer" }}
      >
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
