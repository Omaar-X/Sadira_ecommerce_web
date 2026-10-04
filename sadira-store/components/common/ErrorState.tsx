import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** e.g. a retry <Button>. */
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again in a moment.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center", className)}
    >
      <span
        aria-hidden="true"
        className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-blush text-primary-dark"
      >
        <CircleAlert className="size-7" strokeWidth={1.5} />
      </span>
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
