import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { isOnSale } from "@/lib/pricing";
import { ROUTES } from "@/lib/constants";
import { getProducts } from "@/services/productService";

/** Genuine sale prices appear here automatically; otherwise show curated picks. */
export async function OffersSection() {
  const catalog = await getProducts();
  const offers = catalog.filter(isOnSale);
  const pickIds = ["SAD-ABAYA-001", "SAD-ABAYA-003", "SAD-BAG-002", "SAD-BRACELET-001"];
  const picks = catalog.filter(product => product.featured || pickIds.includes(product.id));
  const products = (offers.length ? offers : picks.length ? picks : catalog).slice(0, 4);
  if (!products.length) return null;
  return <section aria-labelledby="offers-heading" className="border-y border-line bg-blush/30 py-10 md:py-14">
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-dark">{offers.length ? "A little more to love" : "Curated for you"}</p>
          <h2 id="offers-heading" className="mt-3 text-heading">{offers.length ? "Current Offers" : "Sadira Picks"}</h2>
          <p className="mt-2 text-sm text-muted">{offers.length ? "Explore styles with a special price, all in one place." : "A few favourites for your everyday modest wardrobe."}</p>
        </div>
        <Link href={ROUTES.shop} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:text-primary-dark">Explore the collection <ArrowRight className="size-4" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
        {products.map(product => <li key={product.id}><ProductCard product={product} /></li>)}
      </ul>
    </Container>
  </section>;
}
