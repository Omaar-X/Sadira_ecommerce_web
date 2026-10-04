import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { ROUTES } from "@/lib/constants";
import { getNewArrivals } from "@/services/productService";

export const metadata: Metadata = {
  title: "Your Shopping Bag",
  robots: { index: false },
};

export default async function CartPage() {
  // Real products to suggest when the bag is empty (rendered on the server).
  const suggestions = await getNewArrivals(4);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Container className="pt-6 pb-16 md:pt-8 md:pb-24">
        <Breadcrumbs items={[{ label: "Home", href: ROUTES.home }, { label: "Bag" }]} />
        <h1 className="mt-6 text-3xl text-foreground md:mt-8 md:text-4xl">Your Shopping Bag</h1>

        <CartPageContent
          suggestions={
            suggestions.length > 0 && (
              <section aria-labelledby="suggestions-heading" className="mt-4">
                <h2 id="suggestions-heading" className="text-2xl text-foreground">
                  You May Like
                </h2>
                <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
                  {suggestions.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          }
        />
      </Container>
    </main>
  );
}
