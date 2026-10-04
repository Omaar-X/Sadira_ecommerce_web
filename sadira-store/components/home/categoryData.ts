import type { StaticImageData } from "next/image";
// Real catalog photos, used unchanged. Static imports fail the build if a file moves.
import abayaImage from "@/public/catalog/abaya/sad-abaya-001/2.jpeg"; // Abaya Elara, black
import niqabImage from "@/public/catalog/niqab/sad-niqab-001/1.jpeg"; // Premium Saudi Chiffon Niqab
import scarfImage from "@/public/catalog/scarf/sad-scarf-001/2.jpeg"; // Brand Scarf Collection, design 2
import accessoriesImage from "@/public/catalog/bag/sad-bag-001/1.jpeg"; // Shoulder Bag
import comboImage from "@/public/catalog/combo/sad-combo-001/1.jpeg";
import { CATEGORY_GROUPS, ROUTES } from "@/lib/constants";

export interface HomeCategoryImage {
  src: StaticImageData;
  alt: string;
  /** CSS object-position, to keep the product in view when the card crops the photo. */
  position?: string;
}

export interface HomeCategory {
  name: string;
  subtitle: string;
  href: string;
  /** null → the category has no products yet; the card shows the placeholder panel. */
  image: HomeCategoryImage | null;
  /** Desktop width: a third of the row (portrait card) or half (landscape card). */
  size: "third" | "half";
  /** Spans the full width in the 2-column mobile/tablet grid (landscape card). */
  fullWidthOnMobile?: boolean;
}

/** Homepage "Shop by Category" cards, in display order. */
export const HOME_CATEGORIES: HomeCategory[] = [
  {
    name: "Abaya",
    subtitle: "Elegant & Timeless",
    href: ROUTES.shopCategory("abaya"),
    image: {
      src: abayaImage,
      alt: "Full-length black abaya with ruffled sleeve cuffs, worn with a light patterned hijab",
      position: "50% 40%",
    },
    size: "third",
  },
  {
    name: "Burka",
    subtitle: "Collection Coming Soon",
    href: ROUTES.shopCategory("burka"),
    image: null,
    size: "third",
  },
  {
    name: "Niqab",
    subtitle: "Graceful Modesty",
    href: ROUTES.shopCategory("niqab"),
    image: {
      src: niqabImage,
      alt: "Black chiffon niqab laid flat on blush fabric beside a pink tulip",
    },
    size: "third",
  },
  {
    name: "Scarf",
    subtitle: "Style Your Way",
    href: ROUTES.shopCategory("scarf"),
    image: {
      src: scarfImage,
      alt: "Silky scarf with a geometric orange, grey and cream print, draped over a chair",
    },
    size: "third",
  },
  {
    name: "Combo",
    subtitle: "Abaya & Hijab Together",
    href: ROUTES.shopCategory("combo"),
    image: {
      src: comboImage,
      alt: "Black abaya paired with a leopard-print hijab in a floral mirror",
      position: "50% 70%",
    },
    size: "third",
  },
  {
    name: CATEGORY_GROUPS.accessories.name,
    subtitle: "Complete Your Look",
    href: ROUTES.shopGroup("accessories"),
    image: {
      src: accessoriesImage,
      alt: "Four shoulder bags in maroon, black, white and beige against a brick wall",
      position: "50% 45%",
    },
    size: "third",
  },
];
