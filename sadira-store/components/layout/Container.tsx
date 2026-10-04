import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

/** Site-wide width constraint: 1440px max, 16px / 24px / 32–48px side padding. */
export function Container({ as: Component = "div", className, ...props }: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full max-w-site px-4 md:px-6 lg:px-8 xl:px-12", className)}
      {...props}
    />
  );
}
