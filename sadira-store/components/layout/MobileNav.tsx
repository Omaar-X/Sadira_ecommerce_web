import { Suspense } from "react";
import Link from "next/link";
import { NavLink } from "@/components/layout/NavLink";
import { NAV_LINKS } from "@/lib/constants";

const linkClassName =
  "flex items-center border-l-2 border-transparent py-2.5 pl-4 font-serif text-lg text-foreground transition-colors hover:border-primary hover:text-primary-dark aria-[current=page]:border-primary-dark aria-[current=page]:text-primary-dark";

/** Vertical navigation list used inside the mobile menu drawer. */
export function MobileNav() {
  return (
    <nav aria-label="Main">
      <ul>
        {NAV_LINKS.map(({ label, href }) => (
          <li key={href}>
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
