"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/** Query params that distinguish one shop nav link from another. */
const SHOP_FILTER_PARAMS = ["category", "group", "sort"];

function useIsActive(href: string): boolean {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const target = new URL(href, "http://localhost");

  if (target.pathname !== pathname) return false;

  const targetFilters = SHOP_FILTER_PARAMS.filter((key) => target.searchParams.has(key));
  if (targetFilters.length === 0) {
    // Plain "/shop" is only active when no category/sort filter is applied.
    return SHOP_FILTER_PARAMS.every((key) => !searchParams.has(key));
  }
  return targetFilters.every((key) => searchParams.get(key) === target.searchParams.get(key));
}

export interface NavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * Link that sets aria-current="page" when it matches the current URL; style
 * the active state with `aria-[current=page]:`. Uses useSearchParams, so
 * render it inside <Suspense>.
 */
export function NavLink({ href, className, children }: NavLinkProps) {
  const active = useIsActive(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
