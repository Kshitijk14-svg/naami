"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PRICE_CLASS } from "@/lib/typography";

interface SearchResult {
  id: number;
  name: string;
  subtitle: string;
  price: string;
  image: string;
  thumbnailImage?: string;
}

interface NavSearchProps {
  /** "bar" (default) is the desktop header field, hidden below md.
   *  "drawer" renders full-width and always visible, for the mobile menu. */
  variant?: "bar" | "drawer";
}

export default function NavSearch({ variant = "bar" }: NavSearchProps) {
  const isDrawer = variant === "drawer";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        return r.json();
      })
      .then((data: SearchResult[]) => {
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      })
      .catch(() => {
        // Open the dropdown and say so. Previously this set results to [] and
        // left isOpen false, so a failed search was indistinguishable from not
        // having typed anything — the user got no feedback at all.
        setResults([]);
        setError(true);
        setIsOpen(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  // Enter used to do nothing at all: the input is not inside a <form> and had
  // no key handler, so the debounce was the only way to ever see results.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(timerRef.current);
      search(query);
    } else if (e.key === "Escape") {
      close();
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div
      ref={containerRef}
      className={isDrawer ? "relative w-full" : "relative hidden md:block"}
      style={isDrawer ? undefined : { flex: "1 1 0", maxWidth: "280px" }}
    >
      {/* Input row */}
      <div
        className="flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(17,17,17,0.2)", paddingBottom: "4px" }}
      >
        {/* Magnifier icon */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#1A1212", opacity: loading ? 1 : 0.35, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search the Atelier…"
          className="bg-transparent outline-none w-full font-sans"
          style={{
            fontSize: "11px",
            color: "#1A1212",
            letterSpacing: "0.04em",
          }}
        />
        {query && (
          <button
            onClick={close}
            style={{ color: "#1A1212", opacity: 0.35, flexShrink: 0, lineHeight: 1, fontSize: "14px" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: "calc(100% + 8px)",
            backgroundColor: "#F8F1E5",
            border: "1px solid rgba(17,17,17,0.08)",
            boxShadow: "0 8px 32px rgba(17,17,17,0.12)",
            zIndex: 50,
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {error ? (
            <div
              className="font-sans px-4 py-3"
              style={{ fontSize: "10px", color: "#5B1C1C", letterSpacing: "0.08em" }}
              role="alert"
            >
              Search is unavailable right now. Please try again.
            </div>
          ) : results.length === 0 ? (
            <div
              className="font-sans px-4 py-3"
              style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)", letterSpacing: "0.08em" }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((r, i) => (
              <Link
                key={r.id}
                href={`/product/${r.id}`}
                onClick={close}
                className="flex items-center gap-3 hover:bg-[#FFF9EF] transition-colors"
                style={{
                  padding: "10px 14px",
                  borderBottom: i < results.length - 1 ? "1px solid rgba(17,17,17,0.05)" : "none",
                }}
              >
                <div
                  className="relative flex-shrink-0"
                  style={{ width: 38, height: 46, backgroundColor: "#FFF9EF" }}
                >
                  <Image src={r.thumbnailImage ?? r.image} alt={r.name} fill style={{ objectFit: "cover" }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="font-sans font-bold uppercase truncate"
                    style={{ fontSize: "9px", letterSpacing: "0.14em", color: "#1A1212" }}
                  >
                    {r.name}
                  </p>
                  <p
                    className="font-sans truncate mt-0.5"
                    style={{ fontSize: "10px", color: "rgba(17,17,17,0.5)" }}
                  >
                    {r.subtitle}
                  </p>
                  <p className={`${PRICE_CLASS} mt-0.5`} style={{ fontSize: "13px", color: "#1A1212" }}>
                    {r.price}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
