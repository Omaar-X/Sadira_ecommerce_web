import Link from "next/link";
import { Truck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ROUTES } from "@/lib/constants";
/** A static, accurate announcement; no unimplemented coupon or return promises. */
export function AnnouncementBar() {
  return <aside aria-label="Store announcements" className="bg-blush text-foreground"><Container className="flex min-h-10 items-center justify-center gap-2 py-2 text-[0.6875rem] sm:gap-3 sm:text-xs"><Truck aria-hidden="true" className="size-3.5 shrink-0" /><span>Delivery across Bangladesh</span><span aria-hidden="true" className="mx-1 text-foreground/40">·</span><Link href={ROUTES.contact} className="underline underline-offset-4">Need help?</Link></Container></aside>;
}
