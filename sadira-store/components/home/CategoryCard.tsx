import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryPlaceholder } from "@/components/home/CategoryPlaceholder";
import type { HomeCategory } from "@/components/home/categoryData";
import { cn } from "@/lib/utils";

/*
 * Grid: 2 columns on mobile/tablet, 6 on desktop (thirds and halves).
 * Portrait cards are 3:4 (4:5 on desktop); landscape cards are 4:3.
 */
const layoutClasses = {
  third: { card: "lg:col-span-2", frame: "aspect-[3/4] lg:aspect-[4/5]" },
  half: { card: "lg:col-span-3", frame: "aspect-[3/4] lg:aspect-[4/3]" },
} as const;

const SIZES = {
  third: "(min-width: 1440px) 432px, (min-width: 1024px) 30vw, 46vw",
  half: "(min-width: 1440px) 660px, (min-width: 1024px) 46vw, 46vw",
  fullWidth: "(min-width: 1440px) 660px, (min-width: 1024px) 46vw, 92vw",
} as const;

export function CategoryCard({ category }: { category: HomeCategory }) {
  const { name, subtitle, href, image, size, fullWidthOnMobile } = category;
  const layout = layoutClasses[size];

  return (
    <li className={cn(layout.card, fullWidthOnMobile && "col-span-2")}>
      <Link href={href} className="group block rounded-2xl">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-blush ring-1 ring-transparent transition duration-300 ease-soft group-hover:ring-primary/60",
            fullWidthOnMobile ? "aspect-[4/3]" : layout.frame,
          )}
        >
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              placeholder="blur"
              sizes={fullWidthOnMobile ? SIZES.fullWidth : SIZES[size]}
              style={image.position ? { objectPosition: image.position } : undefined}
              className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.03]"
            />
          ) : (
            <CategoryPlaceholder />
          )}
        </div>

        <div className="mt-3 flex items-start justify-between gap-3 md:mt-4">
          <div className="min-w-0">
            <h3 className="font-serif text-lg leading-tight text-foreground transition-colors group-hover:text-primary-dark md:text-2xl">
              {name}
            </h3>
            <p className="mt-1 text-xs text-muted md:text-sm">{subtitle}</p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-foreground transition-transform duration-300 ease-soft group-hover:translate-x-1 group-hover:text-primary-dark md:size-5"
          />
        </div>
      </Link>
    </li>
  );
}
