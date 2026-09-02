/**
 * Editable copy for every non-homepage surface (About, Journal, Collection,
 * Product, Cart, Checkout, Profile, Order confirmation, Footer).
 *
 * These are stored as `design_settings` key/value rows and edited from
 * `/admin/design`. Scalars are plain strings; the four `*_json` keys hold a
 * JSON array (same pattern as `footer_doodle_data`). Multi-paragraph bodies are
 * one string with paragraphs separated by a blank line — render sites split on
 * /\n\s*\n/.
 *
 * IMPORTANT: this module must stay import-pure (no `@/lib/db`, no server-only
 * imports) — it is bundled into client components via `useDesignSettings`.
 */

export interface AboutPillar {
  number: string;
  title: string;
  description: string;
}

export interface AboutMilestone {
  year: string;
  event: string;
  detail: string;
}

export interface JourneyStop {
  image: string;
  caption: string;
}

export interface AboutTeamMember {
  name: string;
  title: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const ABOUT_PILLARS: AboutPillar[] = [
  {
    number: "01",
    title: "The Cloth",
    description:
      "Every shirt begins with a fabric sourced from heritage mills in Italy, Japan, and India. We insist on long-staple cotton, European linen, and handspun khadi — materials that improve with age and resist the shortcuts of modern fast fashion.",
  },
  {
    number: "02",
    title: "The Cut",
    description:
      "Each pattern is developed in-house and hand-cut from a single cloth length, grain-aligned by a single artisan. A shirt that hangs correctly is the result of pattern-making skill, not software shortcuts. We do this the slow way.",
  },
  {
    number: "03",
    title: "The Finish",
    description:
      "Mother-of-pearl buttons are attached by hand. Collars are pressed with a curved iron. Plackets are steamed flat. These final touches take longer than the construction itself — and they are what you feel when you put the shirt on.",
  },
];

const ABOUT_TIMELINE: AboutMilestone[] = [
  { year: "2019", event: "Founded in Lisbon, Portugal", detail: "NAAMI began as an atelier focused on single-origin shirting for the European market." },
  { year: "2021", event: "First Japanese Sourcing Partnership", detail: "Partnerships with Albini Group and Nishimoto Mills opened access to heritage shuttle-loom fabrics." },
  { year: "2023", event: "India Studio Opens", detail: "A second atelier established in Jaipur to work with artisans specialising in handspun khadi and natural-dye techniques." },
  { year: "2026", event: "AW26 Collection Launch", detail: "Fourteen styles across Oxford, Linen, Chambray, and Sashiko lines — available now." },
];

// Ships empty — the admin populates the stops from /admin/our-journey.
const OUR_JOURNEY: JourneyStop[] = [];

const ABOUT_TEAM: AboutTeamMember[] = [
  { name: "Arjun Mehta", title: "Founder & Creative Director" },
  { name: "Clara Fonseca", title: "Head of Pattern & Cut" },
  { name: "Kenji Tanaka", title: "Fabric Sourcing Director" },
];

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Collections",
    links: [
      { label: "Full Collection", href: "/collection" },
      { label: "Shirts", href: "/collection?filter=SHIRTS" },
      { label: "Accessories", href: "/collection?filter=ACCESSORIES" },
      { label: "Limited Editions", href: "/collection?filter=LIMITED" },
    ],
  },
  {
    title: "Philosophy",
    links: [{ label: "Our Story", href: "/about" }],
  },
  {
    title: "Customer Care",
    links: [{ label: "My Orders", href: "/profile" }],
  },
  {
    title: "Naami Universe",
    links: [{ label: "Our Journey", href: "/our-journey" }],
  },
];

const ABOUT_FOUNDING_BODY = [
  "NAAMI was founded with a single conviction: that a well-made shirt is one of the most enduring investments a person can make in their wardrobe. Not because it is expensive, but because it is honest — made from real materials, by real hands, to last a real lifetime.",
  "We started in a small atelier in Lisbon, cutting patterns on a long table and sourcing cloth from the same mills that have supplied European tailors for generations. Our first collection was fourteen shirts. It sold out in three weeks.",
  "Today we work with mills in Italy, Japan, and India, and every shirt still passes through the same hands, in the same atelier, under the same slow discipline. Nothing has been automated. Nothing will be.",
].join("\n\n");

export const PAGE_CONTENT_DEFAULTS: Record<string, string> = {
  // ─── About ────────────────────────────────────────────────────────────────
  about_hero_kicker: "NAAMI // THE STORY",
  about_hero_title: "Shirts Built",
  about_hero_title_accent: "For the Long Game",
  about_hero_subline: "Founded 2019 · Lisbon, Portugal",
  about_story_image: "/images/campaign.jpg",
  about_founding_eyebrow: "The Founding",
  about_founding_body: ABOUT_FOUNDING_BODY,
  about_method_kicker: "NAAMI // THE METHOD",
  about_method_title: "Three",
  about_method_title_accent: "Absolutes",
  about_pillars_json: JSON.stringify(ABOUT_PILLARS),
  about_archive_kicker: "NAAMI // THE ARCHIVE",
  about_timeline_json: JSON.stringify(ABOUT_TIMELINE),
  about_team_kicker: "NAAMI // THE TEAM",
  about_team_json: JSON.stringify(ABOUT_TEAM),
  about_closing_quote:
    "True luxury is found in the fall of a collar and the quiet confidence of a perfectly pressed placket.",
  about_closing_attribution: "— The Atelier Philosophy",
  about_closing_cta_label: "Shop the Collection",

  // ─── Our Journey ──────────────────────────────────────────────────────────
  our_journey_kicker: "NAAMI // OUR JOURNEY",
  our_journey_title: "Our",
  // Uppercase accent line tucked under the title (like "Seasonal / COLLECTIONS").
  // Clear it to render the title on its own.
  our_journey_title_accent: "Journey",
  our_journey_empty_state: "Our journey is being charted.",
  // JSON array of JourneyStop ({ image, caption }) — same pattern as the *_json
  // keys above. Edited from /admin/our-journey.
  our_journey_json: JSON.stringify(OUR_JOURNEY),

  // ─── Collection ───────────────────────────────────────────────────────────
  collection_fallback_eyebrow: "NAAMI // AW26",
  collection_fallback_title: "The",
  collection_fallback_title_accent: "Collection",
  collection_filter_all_label: "ALL",
  collection_quickview_eyebrow_suffix: "NAAMI ATELIER",
  collection_select_size_label: "Select Size",
  collection_add_to_wardrobe_label: "Add to Wardrobe",

  // ─── Product ──────────────────────────────────────────────────────────────
  product_eyebrow_suffix: "NAAMI ATELIER",
  product_add_to_wardrobe_label: "ADD TO WARDROBE",
  product_view_cart_label: "View Cart →",

  // ─── Cart ─────────────────────────────────────────────────────────────────
  cart_empty_kicker: "NAAMI // YOUR WARDROBE",
  cart_empty_title: "Your cart is empty",
  cart_empty_tagline: "If found Wear again",
  cart_empty_body: "Discover pieces crafted from heritage weaves and finest cottons.",
  cart_empty_cta_label: "Explore Collections",
  cart_kicker: "NAAMI // YOUR WARDROBE",
  cart_title: "Shopping Cart",
  cart_tagline: "If found Wear again",
  cart_order_summary_label: "Order Summary",

  // ─── Checkout ─────────────────────────────────────────────────────────────
  checkout_kicker: "NAAMI // CHECKOUT",
  checkout_title: "Complete Order",
  checkout_shipping_label: "Shipping Details",
  checkout_order_summary_label: "Your Order",
  checkout_secure_note: "Secured by Razorpay · 256-bit SSL encryption",

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile_kicker: "NAAMI // MY ACCOUNT",
  profile_tab_profile: "Profile",
  profile_tab_orders: "Order History",
  profile_tab_wishlist: "Wishlist",
  profile_empty_orders: "No orders yet.",
  profile_empty_wishlist: "Your wishlist is empty.",

  // ─── Order confirmation ───────────────────────────────────────────────────
  order_confirmed_kicker: "NAAMI // ORDER CONFIRMED",
  order_confirmed_thankyou: "Thank you",
  order_confirmed_tagline: "If found Wear again",
  order_confirmed_body: "Your order has been received. A confirmation has been sent",
  order_ref_label: "Order Reference",
  order_journey_label: "Order Journey",
  order_tracking_label: "Shipment Tracking",
  order_items_label: "Items Ordered",
  order_shipping_to_label: "Shipping To",
  order_status_pending: "Order Placed",
  order_status_confirmed: "Confirmed",
  order_status_shipped: "Shipped",
  order_status_delivered: "Delivered",
  order_status_cancelled: "Cancelled",

  // ─── Footer ───────────────────────────────────────────────────────────────
  footer_columns_json: JSON.stringify(FOOTER_COLUMNS),
  footer_copyright: "© 2026 Naami — All rights reserved",
  footer_tagline: "Crafted with precision. Made to last lifetimes.",

  // ─── Homepage leftovers (threaded from src/app/page.tsx) ──────────────────
  manifesto_card_label: "NAAMI // COLLECTION",
  carousel_quickview_eyebrow_suffix: "NAAMI // AW26",
};

export const PAGE_CONTENT_KEYS = Object.keys(PAGE_CONTENT_DEFAULTS);

/** Parse a `*_json` setting value into an array, falling back to `fallback`
 *  (the built-in default) if the stored value is missing or malformed. */
export function parseListSetting<T>(value: string | undefined, fallback: T[]): T[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export const ABOUT_PILLARS_DEFAULT = ABOUT_PILLARS;
export const ABOUT_TIMELINE_DEFAULT = ABOUT_TIMELINE;
export const OUR_JOURNEY_DEFAULT = OUR_JOURNEY;
export const ABOUT_TEAM_DEFAULT = ABOUT_TEAM;
export const FOOTER_COLUMNS_DEFAULT = FOOTER_COLUMNS;
