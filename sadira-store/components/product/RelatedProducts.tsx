import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types/product";

/** "You May Also Like" — up to 4 real products in the standard card grid. */
export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className="text-2xl text-foreground md:text-3xl">
        You May Also Like
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
