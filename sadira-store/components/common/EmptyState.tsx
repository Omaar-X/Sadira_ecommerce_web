import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** e.g. a <ButtonLink> back to the shop. */
  action?: ReactNode;
  className?: string;
  /** h1 when the empty state is the page's main content (e.g. 404). */
  headingLevel?: "h1" | "h2";
}

export function EmptyState({ title, description, icon, action, className, headingLevel = "h2" }: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <div
      className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center", className)}
    >
      <span
        aria-hidden="true"
        className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-blush text-primary-dark [&_svg]:size-7"
      >
        {icon ?? <PackageOpen strokeWidth={1.5} />}
      </span>
      <Heading className="text-2xl">{title}</Heading>
      {description && <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
