import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-10",
} as const;

export interface LoadingSpinnerProps {
  size?: keyof typeof sizeClasses;
  /** Screen-reader text. */
  label?: string;
  /** Hide from assistive tech when the parent already announces loading (e.g. a busy button). */
  decorative?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  label = "Loading",
  decorative = false,
  className,
}: LoadingSpinnerProps) {
  const icon = (
    <LoaderCircle
      aria-hidden="true"
      className={cn("animate-spin text-current", sizeClasses[size], className)}
    />
  );

  if (decorative) return icon;

  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
