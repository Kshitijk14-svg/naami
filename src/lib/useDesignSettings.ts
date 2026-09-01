"use client";

import { useEffect, useState } from "react";
import { PAGE_CONTENT_DEFAULTS, parseListSetting } from "@/lib/pageContentDefaults";

type Settings = Record<string, string>;

// Module-scope promise cache — one fetch per full page load, reused across SPA
// navigations (same pattern as EvanliteFooter's doodleCache). A hard nav or
// refresh clears it, which is when an admin edit needs to surface.
let cache: Settings | undefined;
let promise: Promise<Settings> | null = null;

function load(): Promise<Settings> {
  if (!promise) {
    promise = fetch("/api/design/page-content", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Settings) => (cache = { ...PAGE_CONTENT_DEFAULTS, ...data }))
      .catch(() => (cache = { ...PAGE_CONTENT_DEFAULTS }));
  }
  return promise;
}

/** Live editable copy. First render returns the built-in defaults (real copy,
 *  never blank); swaps to admin-saved values once the fetch resolves. */
export function useDesignSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(cache ?? PAGE_CONTENT_DEFAULTS);

  useEffect(() => {
    if (cache) return;
    let active = true;
    load().then((s) => {
      if (active) setSettings(s);
    });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

/** Parse a `*_json` setting into a typed array, falling back to `fallback`. */
export function useDesignList<T>(key: string, fallback: T[]): T[] {
  const settings = useDesignSettings();
  return parseListSetting<T>(settings[key], fallback);
}
