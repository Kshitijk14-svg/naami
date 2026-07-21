"use client";

import { useState } from "react";

interface FeedbackFormProps {
  orderId: string;
}

export default function FeedbackForm({ orderId }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to submit feedback.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mb-10 px-8 py-6" style={{ backgroundColor: "#F8F1E5", borderLeft: "3px solid #5B1C1C" }}>
        <p className="font-serif font-light" style={{ fontSize: "1.05rem", color: "#111" }}>
          Thank you for sharing your thoughts with NAAMI.
        </p>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="mb-10 px-8 py-6" style={{ backgroundColor: "#F8F1E5" }}>
      <p className="font-sans font-bold uppercase tracking-[0.22em] mb-1" style={{ fontSize: "9px", color: "#5B1C1C" }}>
        Tell Us What You Think
      </p>
      <p className="font-sans mb-4" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}>
        Your feedback helps us make NAAMI better.
      </p>

      <div className="flex gap-1 mb-4" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="cursor-pointer"
            style={{
              fontSize: "24px",
              lineHeight: 1,
              color: star <= displayRating ? "#5B1C1C" : "rgba(17,17,17,0.2)",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional — share more about your experience"
        maxLength={1000}
        rows={3}
        className="w-full font-sans outline-none"
        style={{
          fontSize: "12px",
          padding: "10px 12px",
          backgroundColor: "#FFF9EF",
          border: "1px solid rgba(139,26,26,0.15)",
          color: "#111",
          resize: "vertical",
          marginBottom: 12,
        }}
      />

      {error && (
        <p className="font-sans mb-3" style={{ fontSize: "10px", color: "#c0392b" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="font-sans font-bold uppercase tracking-[0.2em] px-6 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
        style={{ fontSize: "9px", backgroundColor: "#5B1C1C", color: "#FFF9EF", border: "none" }}
      >
        {submitting ? "Submitting…" : "Submit Feedback"}
      </button>
    </div>
  );
}
