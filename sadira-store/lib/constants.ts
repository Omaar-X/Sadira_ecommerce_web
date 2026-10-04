/**
 * Central business information. Components must read brand, contact and
 * social details from here instead of repeating them.
 */

export const SITE = {
  name: "Sadira",
  tagline: "Premium Modest Fashion",
  description:
    "Premium hijab, niqab, burka, abaya and modest fashion collection from Sadira, Bangladesh.",
  url: process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  locale: "en_BD",
  country: "Bangladesh",
} as const;

export const CONTACT = {
  /** WhatsApp number in international format. */
  whatsapp: "+8801619362025",
} as const;

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/SadiraBorka",
  instagram: "https://www.instagram.com/sadira_by_sadia",
  tiktok: "https://www.tiktok.com/@sadira_by_sadia09",
  whatsapp: `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`,
} as const;

export const CURRENCY = {
  code: "BDT",
  symbol: "৳",
  /** Bangladesh uses lakh/crore digit grouping, same as en-IN. */
  numberLocale: "en-IN",
} as const;

export const ASSET_PATHS = {
  /** Original logo, unchanged (dark background). Copied by `npm run catalog:prepare`. */
  logo: "/brand/logo.png",
  favicon: "/brand/favicon.png",
  banners: "/banners",
  categories: "/categories",
  catalog: "/catalog",
} as const;

/**
 * Website-only navigation groups. A group filters several real categories;
 * products keep their own category (a bag stays "Bag").
 */
export const CATEGORY_GROUPS = {
  accessories: {
    name: "Accessories",
    categorySlugs: ["bag", "bracelet", "sunglasses", "perfume"],
  },
} as const satisfies Record<string, { name: string; categorySlugs: readonly string[] }>;

export type CategoryGroupSlug = keyof typeof CATEGORY_GROUPS;

export const ROUTES = {
  home: "/",
  shop: "/shop",
  newArrivals: "/shop?sort=newest",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  sizeGuide: "/size-guide",
  returnExchange: "/return-exchange",
  privacy: "/privacy",
  terms: "/terms",
  cart: "/cart",
  checkout: "/checkout",
  shopCategory: (slug: string) => `/shop?category=${slug}`,
  shopGroup: (slug: CategoryGroupSlug) => `/shop?group=${slug}`,
  product: (slug: string) => `/product/${slug}`,
} as const;

export interface NavLink {
  label: string;
  href: string;
}

/** Primary navigation, shared by the desktop nav and the mobile menu. */
export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: ROUTES.home },
  { label: "Shop", href: ROUTES.shop },
  { label: "Abaya", href: ROUTES.shopCategory("abaya") },
  { label: "Burka", href: ROUTES.shopCategory("burka") },
  { label: "Niqab", href: ROUTES.shopCategory("niqab") },
  { label: "Scarf", href: ROUTES.shopCategory("scarf") },
  { label: "Combo", href: ROUTES.shopCategory("combo") },
  { label: CATEGORY_GROUPS.accessories.name, href: ROUTES.shopGroup("accessories") },
  { label: "New Arrivals", href: ROUTES.newArrivals },
  { label: "About", href: ROUTES.about },
  { label: "Contact", href: ROUTES.contact },
];

/** Public informational navigation, also used by the footer and care pages. */
export const CUSTOMER_CARE_LINKS: NavLink[] = [
  { label: "Contact", href: ROUTES.contact },
  { label: "FAQ", href: ROUTES.faq },
  { label: "Size Guide", href: ROUTES.sizeGuide },
  { label: "Return & Exchange", href: ROUTES.returnExchange },
];
export const POLICY_LINKS: NavLink[] = [
  { label: "Privacy Policy", href: ROUTES.privacy },
  { label: "Terms & Conditions", href: ROUTES.terms },
];
