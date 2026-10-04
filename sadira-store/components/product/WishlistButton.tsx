"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Heart toggle on product cards. Visual only for now — nothing is saved
 * until the wishlist is built.
 */
export function WishlistButton({ productName, className }: { productName: string; className?: string }) {
  const [saved, setSaved] = useState(false);
  const label = saved ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      title={label}
      onClick={() => setSaved((value) => !value)}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-white/90 text-foreground transition-colors duration-200 md:size-9",
        "hover:bg-blush hover:text-primary-dark",
        saved && "text-primary-dark",
        className,
      )}
    >
      <Heart
        aria-hidden="true"
        className={cn("size-4 md:size-[1.125rem]", saved && "fill-current")}
        strokeWidth={1.75}
      />
    </button>
  );
}
