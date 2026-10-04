import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";
import { getNewArrivals } from "@/services/productService";

/** One desktop row. Never padded with duplicates if fewer products exist. */
const HOMEPAGE_COUNT = 4;

export async function NewArrivalsSection() {
  const products = await getNewArrivals(HOMEPAGE_COUNT);

  return (
    <section aria-labelledby="new-arrivals-heading" className="py-14 md:py-20 lg:py-24">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 text-xs font-medium tracking-[0.28em] text-foreground uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-primary-dark" />
              New Collection
            </p>
            <h2 id="new-arrivals-heading" className="mt-4 text-heading text-foreground">
              New Arrivals
            </h2>
            <p className="mt-3 text-sm text-muted md:text-base">
              Fresh styles selected for your everyday modest wardrobe.
            </p>
          </div>

          {products.length > 0 && (
            <Link
              href={ROUTES.newArrivals}
              className="group inline-flex items-center gap-2 border-b border-foreground/30 pb-1 text-sm font-medium text-foreground transition-colors hover:border-primary-dark hover:text-primary-dark"
            >
              View All
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1"
              />
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:mt-12 lg:grid-cols-4 lg:gap-x-6">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="New arrivals are coming soon."
            action={<ButtonLink href={ROUTES.shop}>Browse All Products</ButtonLink>}
            className="mt-8"
          />
        )}
      </Container>
    </section>
  );
}
