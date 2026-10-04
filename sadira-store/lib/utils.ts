import { CURRENCY, SOCIAL_LINKS } from "@/lib/constants";

type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy values. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

const priceFormatter = new Intl.NumberFormat(CURRENCY.numberLocale, {
  maximumFractionDigits: 0,
});

/** Formats a BDT amount, e.g. 1550 → "৳ 1,550" (non-breaking space, so it never wraps apart). */
export function formatPrice(amount: number): string {
  return `${CURRENCY.symbol} ${priceFormatter.format(amount)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getWhatsAppUrl(message?: string): string {
  return message
    ? `${SOCIAL_LINKS.whatsapp}?text=${encodeURIComponent(message)}`
    : SOCIAL_LINKS.whatsapp;
}
