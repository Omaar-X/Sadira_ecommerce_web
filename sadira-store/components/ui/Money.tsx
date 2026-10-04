import { CURRENCY } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

/** The Bengali taka glyph, with a dedicated font and consistent price spacing. */
export function Money({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-baseline gap-[0.25em] whitespace-nowrap tabular-nums">
      <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>{CURRENCY.symbol}</span>
      <span>{formatPrice(amount).slice(2)}</span>
    </span>
  );
}
