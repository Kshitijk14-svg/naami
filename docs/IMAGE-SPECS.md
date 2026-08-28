# NAAMI — Image Asset Specification

Canonical reference for every image the site displays: what size to deliver, what
aspect ratio each slot renders at, and how many assets are needed.

---

## How to read this

**1. The pipeline caps every upload at 1920px.**
`src/lib/imageProcessing.ts` resizes every uploaded file with
`resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })`,
then re-encodes to WebP, binary-searching the quality setting to land the file
between **400KB and 800KB**. A **480px-wide thumbnail** is generated alongside it.

> Delivering art above 1920px on the long edge is wasted — the detail is discarded
> on upload. Delivering below the sizes in this doc means upscaling artefacts.

Input limit is **15MB**. Anything `sharp` can decode is accepted (JPEG, PNG, WebP,
TIFF, AVIF); prefer **PNG or high-quality JPEG** as the source since it gets
re-encoded anyway.

**2. Fixed-ratio slots vs. variable-crop slots.**
Most slots have a CSS `aspect-ratio`, so the crop is identical on every device —
just match the ratio (§B). But the hero slider, lookbook banner and loom panels are
sized in **viewport height** (`h-[65vh] md:h-[75vh]`, `height: 90vh`), so a single
file is cropped to landscape on desktop and portrait on mobile. Those slots get a
**safe zone** (§A).

**3. How the safe-zone numbers were derived.**
Under `object-cover`, the visible fraction of a source image is
`boxRatio / sourceRatio` when the box is wider than the source, and the inverse
when it's taller. Picking the source ratio as the **geometric mean** of the desktop
and mobile box ratios equalises the loss at both ends — for the hero that's
`sqrt(2.25 x 0.62) = 1.18`, for the lookbook banner `sqrt(1.98 x 0.51) = 1.00`.
The **safe zone** is the intersection of the desktop and mobile crops: the region
guaranteed visible on every device. Everything critical — faces, garment detail,
hotspot targets — must sit inside it. Reference viewports: desktop 1920x1080,
mobile 390x844.

There is **one asset per slot** — no separate mobile uploads anywhere in the CMS.

---

## A. Variable-crop slots — square-ish source + centered safe zone

| Slot | CMS key | Desktop box | Mobile box | Deliver | Safe zone (centered) |
| --- | --- | --- | --- | --- | --- |
| Hero slides **x3** | `hero_image_1/2/3` | 1824x810 (2.25:1) | 342x549 (0.62:1) | **1920 x 1440** (4:3) | **900 x 850** |
| Lookbook / hotspot banner | `lookbook_banner_image` | 1920x972 (1.98:1) | 390x760 (0.51:1) | **1600 x 1600** (1:1) | **816 x 816** |
| Loom panel 1 | `loom_panel1_image` | 864x648 (1.33:1) | 294x422 (0.70:1) | **1600 x 1600** (1:1) | **1120 x 1200** |
| Loom panel 2 | `loom_panel2_image` | 864x648 (1.33:1) | 294x422 (0.70:1) | **1600 x 1600** (1:1) | **1120 x 1200** |
| Journal / blog cover | `blog_posts.cover_image` | 1920x520 hero (3.7:1) **+** 570x428 card (4:3) **+** 1200x630 OG | 390x422 (0.92:1) | **1920 x 1080** (16:9) | **1000 x 520** |

**Hero slides** — text overlays render bottom-left (`bottom-8 left-8 md:bottom-12
md:left-12` in `src/components/HomeClient.tsx`). Keep that corner visually quiet.
Slide 1 is `priority`-loaded, so it's the largest single contributor to LCP.

**Lookbook banner** — GSAP parallax scales the image to **1.06** at scroll end
(`src/components/HotspotBanner.tsx`), so it renders ~6% larger than the box. It is
also full-bleed (no horizontal padding, unlike the hero). Hotspots are positioned
by `top%`/`left%`, so a changing crop shifts them — place hotspots inside the safe
zone or they will drift off-target between viewports.

**Journal cover** — the hardest-working asset on the site: one file serves a 3.7:1
page hero, a 4:3 index card, and the 1.91:1 OpenGraph share image (used unresized).
Shoot for 16:9 with the subject dead-center. There is no thumbnail column on
`blog_posts`, so the index grid loads the full-size file.

---

## B. Fixed-ratio slots — match the ratio exactly, no safe zone needed

| Slot | Ratio (source of truth) | Largest render | Deliver |
| --- | --- | --- | --- |
| Product images (**up to 6** per product) | `3/4` — `src/app/product/[id]/page.tsx` | 560x747 | **1440 x 1920** |
| Manifesto | `3/4` — `src/components/HomeClient.tsx` | 896x1195 | **1440 x 1920** |
| Collection card — portrait (homepage pos. 1–2) | `4/5` — `src/components/CollectionsShowcase.tsx` | 888x1110 | **1536 x 1920** |
| Collection card — landscape (homepage pos. 3+) | `16/10` — `src/components/CollectionsShowcase.tsx` | 1058x661 | **1920 x 1200** |
| Look cards / "Shop The Look" | `4/5` — `src/components/HotspotCards.tsx` | 352x440 | **1080 x 1350** |
| About page atelier *(hardcoded, no CMS field)* | `4/5` — `src/app/about/page.tsx` | 720x900 | **1536 x 1920** |
| PDP thumbnail strip | 7:9 at 56x72 | 56x72 | auto-generated — no upload |

**Product images** — the first image is the main image and is denormalised onto
`products.image`; the rest form the PDP gallery. Product *cards* (carousel and
collection grid) are served from the 480px thumbnail, so a 3:4 card renders from a
480x640 thumb. That is adequate at 1x but soft at 2x DPR on large screens — a known
limitation, see §F.

**Collections — one file, two very different crops.** `collections.image` feeds a
**4:5 portrait** card in homepage positions 1–2 and a **16:10 landscape** card in
positions 3+, decided by `homeSortOrder`. Moving a collection reframes its image
drastically. If your collection order is not stable, deliver a compromise
**1440 x 1200 (6:5)** instead of either exact ratio — it keeps 67% of the width in
the 4:5 crop and 75% of the height in the 16:10 crop.

---

## C. Section background textures — 10 optional slots

All ten default to empty and are entirely optional. Keys (see
`src/components/admin/design/SectionBackgroundsSection.tsx`):

`hero_bg_image`, `collections_bg_image`, `loom_bg_image`, `new_arrivals_bg_image`,
`lookbook_banner_bg_image`, `hotspot_cards_bg_image`, `bestsellers_bg_image`,
`coin_pocket_bg_image`, `shared_moments_bg_image`, `manifesto_bg_image`

Each has a matching `*_bg_fit` setting:

| Fit | Deliver |
| --- | --- |
| `cover` / `contain` | **1920 x 1080** transparent PNG |
| `tile` | **512 x 512** seamless tile |

> `src/lib/sectionBackground.ts` sets `backgroundSize: "auto"` for `tile`, which
> means the tile renders at its **intrinsic pixel size**. A 1920px file used as a
> tile will render 1920px wide and won't read as a texture. Keep tiles small.

`lookbook_banner_bg_image` sits entirely behind the banner photo — only worth
setting if that photo is transparent or absent.

---

## D. One-off brand assets

| Asset | Path | Rendered | Deliver | Status |
| --- | --- | --- | --- | --- |
| Default OG image | `/og-default.jpg` | 1200x630 | **1200 x 630** | **Missing — must be created.** Referenced by `src/app/layout.tsx` but the file does not exist. |
| Loom logo medallion | `/images/hindi-logo-brown.png` | 173x173, `object-contain` | **512 x 512** transparent PNG | Currently 1080x1350 — wrong ratio for a round medallion. |
| Cursor pearl | `/images/silver-pearl.png` | 48x48, `object-contain` | **144 x 144** transparent PNG | Currently 128x128 — usable, slightly soft at 3x DPR. Desktop only. |

**Not images — no asset needed.** The navbar and footer wordmark are live text, not
a logo file. The footer doodle is SVG path JSON authored in the admin Doodle Editor.
The gateway button is an inline `<svg>`. The coin-pocket card is rendered entirely
from CSS gradients and inline SVG. Shared Moments clips are uploaded directly
in `/admin/design` → Shared Moments (video in, thumbnail auto-generated) — no
separate asset delivery needed.

---

## E. How many images are needed

### Fixed slots — 14 total

| Group | Count |
| --- | --- |
| Hero slides | 3 |
| Lookbook banner | 1 |
| Loom panels | 2 |
| Manifesto | 1 |
| Look cards ("Shop The Look") | 3 *(matches the current fallback set; unbounded — admins can add more)* |
| About page atelier | 1 |
| Default OG image | 1 |
| Brand marks (logo medallion, cursor pearl) | 2 |

### Content-driven — scales with the catalogue

| Group | Count |
| --- | --- |
| Collections | 1 per collection |
| Products | 1–6 per product (`MAX_PRODUCT_IMAGES = 6`) |
| Blog posts | 1 per post |
| Section backgrounds | 0–10, optional |

**Minimum viable launch set: 14 fixed assets, plus 1 per collection, 1 per product,
and 1 per blog post.**

---

## F. Known limitations

These are accepted trade-offs, documented so they aren't rediscovered as bugs:

- **Product cards are served from a 480px thumbnail** but render up to 426x568 CSS
  px in the collection grid — visibly soft at 2x DPR. Raising `THUMBNAIL_WIDTH` to
  640 in `src/lib/imageProcessing.ts` would fix it at the cost of larger thumbs.
- **Full-bleed banners cap at 1920px**, so the hero and lookbook banner are slightly
  soft on 2x-DPR desktop displays. Raising `FULL_IMAGE_MAX_EDGE` per upload type
  would fix it at the cost of page weight.
- **No separate mobile assets.** Hero and lookbook crops are handled by the safe-zone
  rule in §A rather than art direction.
- **The cart and wishlist render the full-size image** into small boxes (72x90 in the
  cart) because those stores don't carry `thumbnailImage`.
- **Blog covers have no thumbnail column**, so the journal index loads full-size files.
- **Uploads are written to `public/images/` on local disk**, not object storage. They
  are not in git and will not survive a container rebuild unless that path is a
  mounted volume.
