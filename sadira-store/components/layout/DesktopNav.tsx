import { Suspense } from "react";
import Link from "next/link";
import { NavLink } from "@/components/layout/NavLink";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const linkClassName = cn(
  "relative py-2 text-sm whitespace-nowrap text-foreground/75 transition-colors duration-200 hover:text-foreground",
  "after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-primary-dark",
  "after:transition-transform after:duration-300 after:ease-soft hover:after:scale-x-100",
  "aria-[current=page]:text-foreground aria-[current=page]:after:scale-x-100",
);

export function DesktopNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-5 xl:gap-8">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={href}>
            {/* The fallback is what gets prerendered, before the URL query is known. */}
            <Suspense
              fallback={
                <Link href={href} className={linkClassName}>
                  {label}
                </Link>
              }
            >
              <NavLink href={href} className={linkClassName}>
                {label}
              </NavLink>
            </Suspense>
          </li>
        ))}
      </ul>
    </nav>
  );
}
