import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "soft" | "rose" | "dark" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  soft: "bg-blush text-foreground",
  rose: "bg-primary text-foreground",
  dark: "bg-foreground text-white",
  outline: "border border-line bg-white text-muted",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "soft", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium tracking-wider uppercase",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
