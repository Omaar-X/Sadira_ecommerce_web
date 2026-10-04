import { CURRENCY } from "@/lib/constants";
import { BangladeshiTaka } from "lucide-react";
import { formatPrice } from "@/lib/utils";

/** A clear taka symbol sized to match the price digits, independent of font fallback. */
export function Money({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-[0.2em] whitespace-nowrap tabular-nums">
      <span className="sr-only">{CURRENCY.symbol} </span>
      <BangladeshiTaka
        aria-hidden="true"
        viewBox="5 2 14 20"
        className="h-[0.95em] w-[0.665em] shrink-0"
        strokeWidth={1.8}
      />
      <span>{formatPrice(amount).slice(2)}</span>
    </span>
  );
}
