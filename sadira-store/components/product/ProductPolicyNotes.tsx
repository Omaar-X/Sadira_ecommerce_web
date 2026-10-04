import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { ChevronDown, RefreshCcw, Truck, type LucideIcon } from "lucide-react";

interface PolicyNote {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

/*
 * Deliberately general: exact delivery times/charges and an exchange policy
 * haven't been provided yet, so nothing specific is promised here.
 */
const NOTES: PolicyNote[] = [
  {
    icon: Truck,
    title: "Delivery Information",
    href: ROUTES.faq,
    linkLabel: "Ordering & delivery FAQ",
    body: "Delivery is available across Bangladesh. Delivery charges are shown during available online checkout. Contact Sadira with questions about delivery timing.",
  },
  {
    icon: RefreshCcw,
    title: "Exchange Information",
    href: ROUTES.returnExchange,
    linkLabel: "Return & Exchange",
    body: "Exchange availability and conditions may depend on the product and order situation. Please contact Sadira before returning any item.",
  },
];

/** Collapsible delivery/exchange notes (native <details>, no JavaScript). */
export function ProductPolicyNotes() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {NOTES.map(({ icon: Icon, title, body, href, linkLabel }) => (
        <details key={title} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
            <Icon aria-hidden="true" className="size-4 text-primary-dark" />
            <span className="flex-1">{title}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 pl-7 text-sm leading-relaxed text-muted">{body}</p>
          <Link href={href} className="mt-2 inline-flex min-h-11 items-center pl-7 text-sm underline underline-offset-4">{linkLabel}</Link>
        </details>
      ))}
    </div>
  );
}
