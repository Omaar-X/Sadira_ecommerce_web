import { MessageCircle, ShoppingBag, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustPoint {
  icon: LucideIcon;
  title: string;
  text: string;
}

const TRUST_POINTS: TrustPoint[] = [
  { icon: ShoppingBag, title: "Modest Styles", text: "For your everyday wardrobe" },
  { icon: Truck, title: "Bangladesh Delivery", text: "Delivery across the country" },
  { icon: MessageCircle, title: "Customer Care", text: "Contact our official channels" },
];

/**
 * Three compact reassurance points under the hero CTA. One column where the
 * text column is narrow (mobile, 2-column tablet/laptop), a row otherwise;
 * in the xl row each icon sits above its text so labels don't wrap.
 */
export function HeroTrustPoints({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid gap-4 border-t border-line pt-6 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3 xl:gap-6",
        className,
      )}
    >
      {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-center gap-3 xl:flex-col xl:items-start xl:gap-2.5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-blush text-primary-dark">
            <Icon aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{title}</span>
            <span className="text-xs text-muted">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
