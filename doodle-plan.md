# Footer Doodle — Admin-Drawn Special Message

## Context

The admin should be able to draw a freehand, multicolor doodle (a special message for customers) in the admin dashboard's Design page, and have it display on the **right side of the site footer**. The big "NAAMI" wordmark in the footer must be adjusted (shrunk + left-aligned) so the doodle gets its own reserved area with **no overlap**.

### Current state (from codebase exploration)

- `src/components/EvanliteFooter.tsx` — client component, **no props**, rendered per-page in ~11 pages (HomeClient, about, profile, orders/[id], product/[id], checkout, cart, journal, journal/[slug]) — it is NOT in the root layout. The NAAMI wordmark (lines 214–230) is plain text: full-width div, `text-center pointer-events-none mt-8 z-0`, inline style `fontSize: 16vw`, weight 700, letterSpacing 0.25em, color `#8B1A1A`, opacity 0.075, `translateY(15%)`. Footer root has `relative overflow-hidden`, background `#EDE8DC`.
- Design settings = `design_settings` key/value table (`key` varchar(100) PK, `value` unbounded `text`), read via Redis-cached `getAllDesignSettings()` in `src/db/queries/designSettings.ts` (defaults in `DEFAULT_DESIGN_SETTINGS`), written via admin-only `POST /api/admin/design` → `bulkSetSettings` (busts the Redis cache). Admin editor `src/app/admin/design/page.tsx` uses a per-section save pattern: `saveSettingsSubset(keys)` helper (line 229) + per-section `saving/saved/error` state trio (e.g. `saveManifesto`, line 282). The recent "Task E" (section headers) commit is the exact template for adding new settings keys.
- **No public (non-admin) design-settings endpoint exists** — `/api/admin/design` GET is admin-auth only.
- **No canvas/drawing library installed** (deps: gsap, lucide-react, zustand, sharp, drizzle-orm, …). No `<canvas>` usage anywhere. The image-upload pipeline (`/api/admin/upload` → sharp → WebP on disk) is raster-only, wrong fit for a vector doodle. We hand-roll the editor with pointer events — no new dependency.
- Stack: Next.js 16.2.6 (App Router), React 19, Tailwind v4, Drizzle + Postgres, Upstash Redis. Note AGENTS.md: consult `node_modules/next/dist/docs/` for conventions.

## Key decisions

1. **Store stroke JSON, not raw SVG or raster PNG.** Strokes are re-editable (admin can reopen and continue/undo), compact (~1–20 KB vs 50–300 KB base64 PNG), scale crisply, and rendering `<path>` elements from validated JSON in React avoids `dangerouslySetInnerHTML` entirely (no stored-XSS surface even from a compromised admin session). A shared `parseDoodle()` validator (hex-color regex, numeric points, size caps) runs at every read site.
2. **Deliver via a new tiny public route** `GET /api/design/footer-doodle` + one-time client fetch in the footer (module-scope memo). Avoids threading props through 11 pages or converting the footer's usage sites.
3. **Zero regression when unused:** if the doodle is disabled/empty/unparseable/fetch-fails, the footer renders **exactly today's markup** (full-width 16vw centered wordmark). Only when a doodle exists does the bottom row switch to wordmark-left (11vw) + doodle-right (~30%) as flex siblings — no overlap by construction.

## Data model (new file `src/lib/doodle.ts`)

```ts
export const DOODLE_VIEWBOX = { w: 400, h: 250 } as const; // 8:5
export const DOODLE_COLORS = ["#8B1A1A","#111111","#2E6B3A","#1F3A5F","#B8752C","#7A4E8C","#C24A4A","#5E5240"] as const;
export const DOODLE_WIDTHS = [3, 6, 10] as const; // Fine / Medium / Bold

export interface DoodleStroke { color: string; width: number; points: [number, number][]; }
export interface DoodleData { version: 1; strokes: DoodleStroke[]; }
// Limits: 400 strokes, 8000 total points, 200 KB JSON
```

Functions (pure, no `"use client"`, shared by editor + footer + API):
- `parseDoodle(raw: string): DoodleData | null` — try/catch `JSON.parse`; validate `version === 1`, stroke limits, `color` matches `/^#[0-9a-fA-F]{6}$/`, width finite & clamped 1–20, points are finite `[x, y]` pairs. Returns `null` on any failure.
- `serializeDoodle(strokes): string` — points rounded to 1 decimal for compactness; `""` when empty.
- `strokeToPathD(points): string` — midpoint quadratic smoothing (`M p0`, then `Q p[i] mid(p[i], p[i+1])`…, final `L`); single point → tiny `l 0.01 0` so a tap renders as a dot (round linecap).

## Files

### New

1. **`src/lib/doodle.ts`** — as above.

2. **`src/components/DoodleSvg.tsx`** — pure presentational: `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet" aria-hidden fill="none">` mapping strokes to `<path d={strokeToPathD(s.points)} stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" fill="none">`. Used by **both** the editor preview and the footer, so what the admin draws is pixel-identical to what customers see.

3. **`src/components/admin/DoodleEditor.tsx`** — `"use client"`. Props `{ value: string; onChange: (json: string) => void }` (fits the design page's `settings[key]` / `update(key, value)` string convention).
   - State: `strokes` (initialized once from `parseDoodle(value)?.strokes ?? []`), `liveStroke` (in-progress), `color` (default `#8B1A1A`), `brushWidth` (default 6); `svgRef` for `getBoundingClientRect()` → viewBox coordinate conversion (clamped).
   - Drawing surface: div `aspect-[8/5] max-w-[560px] cursor-crosshair select-none`, background `#EDE8DC` (the actual footer cream so the preview is truthful), border `1px solid rgba(139,26,26,0.15)`; one `<svg>` with `style={{ touchAction: "none" }}` (so touch/stylus drawing doesn't scroll) and pointer handlers:
     - `onPointerDown`: `setPointerCapture`, start `liveStroke`.
     - `onPointerMove`: append point only if ≥ 2 viewBox units from the last (thins data ~5×); respect the total-points cap.
     - `onPointerUp`/`onPointerCancel`: commit stroke into `strokes`, then `onChange(serializeDoodle(next))`; if output exceeds the byte cap, drop the stroke and show an inline "Doodle too complex" note.
   - Toolbar (match admin page aesthetic — 9px uppercase tracked labels, `#8B1A1A` accents): 8 color swatches (24px squares; active = `outline: 2px solid #8B1A1A; outline-offset: 2px`), 3 brush-size buttons (dot previews sized 3/6/10), **Undo** (pop last stroke + onChange), **Clear** (`setStrokes([])` + `onChange("")`).

4. **`src/app/api/design/footer-doodle/route.ts`** — public GET (no auth; it's public content):
   ```ts
   import { getAllDesignSettings } from "@/db/queries/designSettings";
   import { parseDoodle } from "@/lib/doodle";

   export async function GET() {
     const s = await getAllDesignSettings();
     const doodle = s.footer_doodle_enabled === "true" ? parseDoodle(s.footer_doodle_data ?? "") : null;
     return Response.json(
       { doodle },
       { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" } }
     );
   }
   ```
   Returns only the doodle field, never the full settings record. Server-side parse ⇒ clients receive pre-validated data or `null`.

### Modified

5. **`src/db/queries/designSettings.ts`** — add to `DEFAULT_DESIGN_SETTINGS`: `footer_doodle_data: ""`, `footer_doodle_enabled: "false"`. No schema/migration change (key/value table).

6. **`src/app/admin/design/page.tsx`** — new "Footer Doodle" section following the Task E pattern verbatim:
   - Import `DoodleEditor`; add state trio `doodleSaving/doodleSaved/doodleError`; `saveDoodle()` copied from `saveManifesto` (line 282) calling `saveSettingsSubset(["footer_doodle_data", "footer_doodle_enabled"])`.
   - Section JSX after Section Headers: explanatory line ("Draw a freehand message. It appears at the bottom-right of the site footer next to the NAAMI wordmark."), enable checkbox bound to `settings.footer_doodle_enabled === "true"` → `update("footer_doodle_enabled", checked ? "true" : "false")`, then `<DoodleEditor value={settings.footer_doodle_data ?? ""} onChange={(v) => update("footer_doodle_data", v)} />`, error line + save button + "Saved ✓" identical to the other sections.

7. **`src/components/EvanliteFooter.tsx`**
   - Add a module-scope one-time fetch memo + `useFooterDoodle()` hook (cached promise so SPA navigations don't refetch; any error → `null`):
     ```ts
     let doodleCache: DoodleStroke[] | null | undefined; // undefined = never fetched
     let doodlePromise: Promise<DoodleStroke[] | null> | null = null;
     function useFooterDoodle(): DoodleStroke[] | null { /* fetch /api/design/footer-doodle once, setState */ }
     ```
   - Replace the wordmark block (lines 214–230) with a conditional:
     - **No doodle:** today's markup byte-for-byte (full-width, `text-center`, 16vw).
     - **Doodle present:** bottom row `w-full mt-8 z-0 flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-8`:
       - Doodle: `order-1 md:order-2 w-[70%] mx-auto md:mx-0 md:w-[30%] md:max-w-[420px] md:shrink-0 md:pb-[1%] pointer-events-none select-none` wrapping `<DoodleSvg strokes={doodle} className="w-full h-auto" />` (`md:pb-[1%]` lifts it slightly since the wordmark bleeds below baseline via translateY).
       - Wordmark: `order-2 md:order-1 min-w-0 text-center md:text-left select-none pointer-events-none text-[16vw] md:text-[11vw]` + `whiteSpace: "nowrap"`, keeping all other existing inline styles (serif font, weight 700, 0.25em tracking, lineHeight 0.8, `#8B1A1A`, opacity 0.075, translateY(15%), willChange). At 11vw + tracking, "NAAMI" spans ~50–55vw — fits the left column beside the 30% right column with the gap; they're flex siblings, so overlap is impossible.
       - Mobile: doodle centered above a full-width 16vw centered wordmark.
   - Loading behavior: first paint shows today's footer; when the fetch resolves with a doodle the row reflows once (below-the-fold, acceptable; optionally a 300 ms opacity fade).

## Implementation order

`src/lib/doodle.ts` → `DoodleSvg.tsx` → `designSettings.ts` defaults → public API route → `DoodleEditor.tsx` → admin design page section → footer layout.

## Caching

| Layer | Mechanism | Invalidation |
|---|---|---|
| Redis | existing `design:settings` cache (1 h TTL) | busted immediately by `bulkSetSettings` on admin save |
| HTTP | `no-store` on the new route (+ `force-dynamic`) — browser/CDN caching made saves invisible for minutes-to-a-day, so freshness wins; Redis is the real cache | n/a — always fresh |
| Client | module-scope promise memo in footer | per full page load (SPA navs reuse it) |

## Verification (dev server + Playwright MCP)

1. `npx tsc --noEmit`; `npm run dev`.
2. Baseline: `GET /api/design/footer-doodle` → `{"doodle":null}` with the Cache-Control header; footer on `/` identical to today.
3. In `/admin/design` → "Footer Doodle": draw multi-point strokes (pointer-event sequences via Playwright), switch colors and brush sizes mid-drawing (multicolor paths render live), test Undo (removes last stroke) and Clear (empties canvas).
4. Enable toggle + Save → "Saved ✓"; API now returns the strokes (Redis was busted).
5. Check `/`, `/about`, `/cart`: doodle bottom-right, wordmark shrunk/left-aligned, no overlap. Screenshots at 1440 px and 390 px (mobile: doodle centered above the centered wordmark).
6. Reload `/admin/design` — existing strokes reload into the editor (re-editable); add a stroke, save, confirm the footer updates.
7. Toggle off + save → API returns `null` → footer reverts to the exact original full-width wordmark.
8. Robustness: set `footer_doodle_data` to `"not json"` and to a stroke with `"color":"javascript:x"` — both must parse to `null`; footer unaffected.
9. Drawing doesn't scroll the admin page (touch-action); a single click yields a visible dot.
