"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type AnnouncementSlot = { enabled: boolean; text: string; link: string | null };

const ROTATE_INTERVAL_MS = 4500;

export default function AnnouncementBar() {
  const pathname = usePathname();
  const [slots, setSlots] = useState<AnnouncementSlot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetch("/api/design/announcements")
      .then((r) => r.json())
      .then((data: { slots: AnnouncementSlot[] }) => setSlots(data.slots ?? []))
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
  if (slots.length === 0) return null;

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
      className="w-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#5B1C1C", height: "34px" }}
    >
      {active.link ? (
        <Link href={active.link} className="hover:opacity-80 transition-opacity">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
