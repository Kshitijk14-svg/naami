"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
  id: number;
  name: string;
  subtitle: string;
  price: string;
  image: string;
}

export default function NavSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: SearchResult[]) => {
        setResults(data);
        setIsOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
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
    <div ref={containerRef} className="relative hidden md:block" style={{ flex: "1 1 0", maxWidth: "280px" }}>
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
          style={{ color: "#111111", opacity: loading ? 1 : 0.35, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search the Atelier…"
          className="bg-transparent outline-none w-full font-sans"
          style={{
            fontSize: "11px",
            color: "#111111",
            letterSpacing: "0.04em",
          }}
        />
        {query && (
          <button
            onClick={close}
            style={{ color: "#111111", opacity: 0.35, flexShrink: 0, lineHeight: 1, fontSize: "14px" }}
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
            backgroundColor: "#EDE8DC",
            border: "1px solid rgba(17,17,17,0.08)",
            boxShadow: "0 8px 32px rgba(17,17,17,0.12)",
            zIndex: 50,
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {results.length === 0 ? (
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
                className="flex items-center gap-3 hover:bg-[#F4F0E6] transition-colors"
                style={{
                  padding: "10px 14px",
                  borderBottom: i < results.length - 1 ? "1px solid rgba(17,17,17,0.05)" : "none",
                }}
              >
                <div
                  className="relative flex-shrink-0"
                  style={{ width: 38, height: 46, backgroundColor: "#F4F0E6" }}
                >
                  <Image src={r.image} alt={r.name} fill style={{ objectFit: "cover" }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="font-sans font-bold uppercase truncate"
                    style={{ fontSize: "9px", letterSpacing: "0.14em", color: "#111111" }}
                  >
                    {r.name}
                  </p>
                  <p
                    className="font-sans truncate mt-0.5"
                    style={{ fontSize: "10px", color: "rgba(17,17,17,0.5)" }}
                  >
                    {r.subtitle}
                  </p>
                  <p className="font-serif mt-0.5" style={{ fontSize: "13px", color: "#111111" }}>
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
