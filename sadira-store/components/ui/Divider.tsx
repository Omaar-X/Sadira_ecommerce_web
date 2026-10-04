import { cn } from "@/lib/utils";

export interface DividerProps {
  /** Optional centred text, e.g. "or". */
  label?: string;
  /** Short decorative rose accent instead of a full-width line. */
  accent?: boolean;
  className?: string;
}

export function Divider({ label, accent = false, className }: DividerProps) {
  if (accent) {
    return <hr className={cn("mx-auto h-px w-12 border-0 bg-primary", className)} />;
  }

  if (!label) {
    return <hr className={cn("h-px w-full border-0 bg-line", className)} />;
  }

  return (
    <div role="separator" className={cn("flex items-center gap-4", className)}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs tracking-widest text-muted uppercase">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
