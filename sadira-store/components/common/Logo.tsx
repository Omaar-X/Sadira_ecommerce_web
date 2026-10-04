import Image from "next/image";
import Link from "next/link";
import logo from "@/public/brand/logo-transparent.png";
import { ROUTES, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
}

/**
 * Sadira logo on a transparent background with charcoal lettering, made from
 * the original public/brand/logo.png by scripts/make-logo-transparent.py.
 */
export function Logo({ className }: LogoProps) {
  return (
    <Link
      href={ROUTES.home}
      aria-label={`${SITE.name} — home`}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Image
        src={logo}
        alt={SITE.name}
        loading="eager"
        sizes="(min-width: 1024px) 120px, 96px"
        className="h-11 w-auto lg:h-14"
      />
    </Link>
  );
}
