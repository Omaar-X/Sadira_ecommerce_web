import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";

const spacingClasses = {
  none: "",
  sm: "py-8 md:py-12",
  md: "py-12 md:py-16 lg:py-20",
  lg: "py-16 md:py-24 lg:py-32",
} as const;

const toneClasses = {
  default: "",
  soft: "bg-blush",
  white: "bg-white",
} as const;

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  spacing?: keyof typeof spacingClasses;
  tone?: keyof typeof toneClasses;
  /** Wrap children in the site Container (default true). */
  contained?: boolean;
}

export function Section({
  spacing = "md",
  tone = "default",
  contained = true,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(spacingClasses[spacing], toneClasses[tone], className)} {...props}>
      {contained ? <Container>{children}</Container> : children}
    </section>
  );
}
