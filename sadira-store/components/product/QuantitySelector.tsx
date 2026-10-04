"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuantitySelectorProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** id of a visible label, or… */
  labelId?: string;
  /** …an accessible name when there's no visible label (e.g. "Quantity for Abaya Elara"). */
  label?: string;
  size?: "sm" | "md";
}

/** − n + stepper, clamped to 1…max. Minus is disabled at 1 (it never removes an item). */
export function QuantitySelector({
  value,
  max,
  onChange,
  disabled = false,
  labelId,
  label,
  size = "md",
}: QuantitySelectorProps) {
  const buttonClass = cn(
    "inline-flex items-center justify-center text-foreground transition-colors hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-foreground",
    "size-11",
  );

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : label}
      className="inline-flex items-center rounded-full border border-line bg-white"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className={buttonClass}
      >
        <Minus aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} />
      </button>
      <output
        aria-live="polite"
        className={cn("text-center font-medium tabular-nums", size === "sm" ? "w-6 text-xs" : "w-8 text-sm")}
      >
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={buttonClass}
      >
        <Plus aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} />
      </button>
    </div>
  );
}
