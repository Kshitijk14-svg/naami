"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type AnnouncementSlot = { enabled: boolean; text: string; link: string | null };

const ROTATE_INTERVAL_MS = 4500;
const DISMISS_KEY = "announcement-dismissed";

export default function AnnouncementBar() {
  const pathname = usePathname();
  const [slots, setSlots] = useState<AnnouncementSlot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/design/announcements")
      .then((r) => r.json())
      .then((data: { slots: AnnouncementSlot[] }) => {
        try {
          if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
        } catch {}
        setSlots(data.slots ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slots.length < 2) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slots.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slots.length]);

  if (pathname === "/auth" || pathname.startsWith("/admin")) return null;
  if (slots.length === 0 || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const active = slots[activeIndex % slots.length];

  const content = (
    <span
      key={activeIndex}
      className="font-sans font-bold uppercase tracking-[0.18em] announcement-bar-fade"
      style={{ fontSize: "10px", color: "#FFF9EF" }}
    >
      {active.text}
    </span>
  );

  return (
    <div
      className="relative w-full flex items-center justify-center overflow-hidden px-10"
      style={{ backgroundColor: "#5B1C1C", height: "34px" }}
    >
      {active.link ? (
        <Link href={active.link} className="hover:opacity-80 transition-opacity">
          {content}
        </Link>
      ) : (
        content
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center hover:opacity-70 transition-opacity"
        style={{ color: "#FFF9EF", fontSize: "18px", lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
